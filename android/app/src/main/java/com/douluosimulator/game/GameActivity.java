package com.douluosimulator.game;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.Base64;
import android.view.Gravity;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.TextView;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import java.util.Collections;
import java.util.HashMap;
import java.util.UUID;
import org.json.JSONObject;

public final class GameActivity extends Activity {
    private static final int OPEN_DOCUMENT = 1;
    private static final int EXPORT_DOCUMENT = 2;
    private static final long MAX_EXPORT_BYTES = 256L * 1024 * 1024;
    private WebView web;
    private ValueCallback<Uri[]> fileChooser;
    private final Object exportLock = new Object();
    private String exportId;
    private File exportFile;
    private boolean pickingExport;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        TextView status = new TextView(this);
        status.setGravity(Gravity.CENTER);
        status.setText("正在启动本机规则服务…");
        setContentView(status);
        GameRuntime.launch(getApplicationContext()).whenComplete((ready, error) -> runOnUiThread(() -> {
            if (isDestroyed() || isFinishing()) return;
            if (error != null || !GameRuntime.running()) {
                status.setText("本机规则服务启动失败。请完全关闭游戏后重新打开。");
                return;
            }
            showGame(state);
        }));
    }

    private void showGame(Bundle state) {
        web = new WebView(this);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(true);
        web.addJavascriptInterface(new Bridge(), "DouluoAndroidNative");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !isGame(request.getUrl());
            }

            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if (!isGame(uri) || path == null) return errorResponse(403, "Forbidden");
                if (path.startsWith("/api/")) {
                    String access = request.getRequestHeaders().entrySet().stream()
                            .filter(entry -> entry.getKey().equalsIgnoreCase(GameRuntime.ACCESS_HEADER))
                            .map(Map.Entry::getValue).findFirst().orElse("");
                    if (GameRuntime.running() && GameRuntime.ACCESS_KEY.equals(access)) return null;
                    return errorResponse(403, "Forbidden");
                }
                if (!request.getMethod().equals("GET")) return errorResponse(405, "Method Not Allowed");
                return asset(path.equals("/") ? "/index.html" : path);
            }

            @Override public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                setContentView(new TextView(GameActivity.this));
                view.destroy();
                web = null;
                recreate();
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> result,
                    FileChooserParams params) {
                if (fileChooser != null) fileChooser.onReceiveValue(null);
                fileChooser = result;
                Intent picker = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                picker.addCategory(Intent.CATEGORY_OPENABLE);
                String[] types = params.getAcceptTypes();
                picker.setType(types.length == 1 && types[0].contains("/") ? types[0] : "*/*");
                try {
                    startActivityForResult(picker, OPEN_DOCUMENT);
                } catch (android.content.ActivityNotFoundException error) {
                    fileChooser = null;
                    result.onReceiveValue(null);
                }
                return true;
            }
        });
        setContentView(web);
        if (state == null || web.restoreState(state) == null) web.loadUrl(GameRuntime.ORIGIN + "/index.html");
    }

    private static boolean isGame(Uri uri) {
        return "http".equals(uri.getScheme()) && "127.0.0.1".equals(uri.getHost()) &&
                uri.getPort() == 18753 && uri.getUserInfo() == null;
    }

    private WebResourceResponse asset(String path) {
        if (!path.matches("/[a-zA-Z0-9_./%-]+") || path.contains("..")) {
            return errorResponse(404, "Not Found");
        }
        try {
            InputStream stream = getAssets().open("www" + path);
            Map<String, String> headers = new HashMap<>();
            headers.put("X-Content-Type-Options", "nosniff");
            if (path.equals("/index.html")) headers.put("Cache-Control", "no-store");
            headers.put("Content-Security-Policy",
                    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: blob:; media-src 'self' blob:; worker-src 'self' blob:; " +
                    "object-src 'none'; frame-src 'none'; base-uri 'none'");
            return new WebResourceResponse(mime(path), "UTF-8", 200, "OK", headers, stream);
        } catch (java.io.IOException error) {
            return errorResponse(404, "Not Found");
        }
    }

    private static String mime(String path) {
        String extension = path.substring(path.lastIndexOf('.') + 1);
        switch (extension) {
            case "html": return "text/html";
            case "js": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "mp3": return "audio/mpeg";
            case "ogg": return "audio/ogg";
            case "wav": return "audio/wav";
            case "woff": return "font/woff";
            case "woff2": return "font/woff2";
            default: return "application/octet-stream";
        }
    }

    private static WebResourceResponse errorResponse(int status, String reason) {
        return new WebResourceResponse("text/plain", "UTF-8", status, reason,
                Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(new byte[0]));
    }

    private final class Bridge {
        private final ModelCredentials credentials = new ModelCredentials(getApplicationContext());

        @JavascriptInterface public String accessKey() { return GameRuntime.ACCESS_KEY; }
        @JavascriptInterface public String version() { return BuildConfig.VERSION_NAME; }

        @JavascriptInterface public String credentials(String action, String data) {
            try {
                return new JSONObject().put("value", credentials.handle(action, data)).toString();
            } catch (Exception error) {
                return "{\"error\":\"本机未能访问此模型的凭据，请在设置中重新填写\"}";
            }
        }

        @JavascriptInterface public String beginExport() {
            synchronized (exportLock) {
                if (exportFile != null) return "";
                try {
                    exportFile = File.createTempFile("douluo-export-", ".tmp", getCacheDir());
                    exportId = UUID.randomUUID().toString();
                    return exportId;
                } catch (java.io.IOException error) {
                    return "";
                }
            }
        }

        @JavascriptInterface public boolean appendExport(String id, String data) {
            synchronized (exportLock) {
                if (exportFile == null || !TextUtils.equals(exportId, id) || pickingExport ||
                        data.length() > 32768) return false;
                try {
                    byte[] bytes = Base64.decode(data, Base64.NO_WRAP);
                    if (exportFile.length() + bytes.length > MAX_EXPORT_BYTES) return false;
                    Files.write(exportFile.toPath(), bytes, StandardOpenOption.APPEND);
                    return true;
                } catch (Exception error) {
                    return false;
                }
            }
        }

        @JavascriptInterface public void finishExport(String id, String name, String type) {
            synchronized (exportLock) {
                if (exportFile == null || !TextUtils.equals(exportId, id) || pickingExport) return;
                pickingExport = true;
            }
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType(type.equals("application/gzip") ? "application/gzip" : "application/json");
                String safeName = name.replace('/', '_').replace('\\', '_');
                intent.putExtra(Intent.EXTRA_TITLE, safeName.substring(0, Math.min(safeName.length(), 180)));
                try {
                    startActivityForResult(intent, EXPORT_DOCUMENT);
                } catch (android.content.ActivityNotFoundException error) {
                    completeExport(id, "error");
                }
            });
        }

        @JavascriptInterface public void discardExport(String id) {
            synchronized (exportLock) {
                if (!pickingExport && TextUtils.equals(exportId, id)) cleanExport();
            }
        }
    }

    private void cleanExport() {
        if (exportFile != null) exportFile.delete();
        exportFile = null;
        exportId = null;
        pickingExport = false;
    }

    private void completeExport(String id, String result) {
        synchronized (exportLock) {
            if (!TextUtils.equals(exportId, id)) return;
            cleanExport();
        }
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript("dispatchEvent(new CustomEvent('douluo-android-export'," +
                    "{detail:[" + JSONObject.quote(id) + "," + JSONObject.quote(result) + "]}))", null);
        });
    }

    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        Uri uri = result == RESULT_OK && data != null ? data.getData() : null;
        if (request == OPEN_DOCUMENT && fileChooser != null) {
            ValueCallback<Uri[]> callback = fileChooser;
            fileChooser = null;
            callback.onReceiveValue(uri == null ? null : new Uri[]{uri});
        }
        if (request == EXPORT_DOCUMENT) {
            File file;
            String id;
            synchronized (exportLock) { file = exportFile; id = exportId; }
            if (file == null) return;
            if (uri == null) {
                completeExport(id, "cancelled");
                return;
            }
            new Thread(() -> {
                try (OutputStream output = getContentResolver().openOutputStream(uri, "wt")) {
                    if (output == null) throw new java.io.IOException();
                    Files.copy(file.toPath(), output);
                } catch (Exception error) {
                    completeExport(id, "error");
                    return;
                }
                completeExport(id, "saved");
            }, "douluo-export").start();
        }
    }

    @Override protected void onSaveInstanceState(Bundle state) {
        if (web != null) web.saveState(state);
        super.onSaveInstanceState(state);
    }

    @Override public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override protected void onDestroy() {
        if (fileChooser != null) fileChooser.onReceiveValue(null);
        synchronized (exportLock) { cleanExport(); }
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
