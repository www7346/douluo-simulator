package com.douluosimulator.game;

import android.content.Context;
import java.io.BufferedReader;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.security.SecureRandom;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;

final class GameRuntime {
    static final String ORIGIN = "http://127.0.0.1:18753";
    static final String ACCESS_HEADER = "X-Douluo-Device-Key";
    private static final byte[] RANDOM = new byte[32];
    static {
        new SecureRandom().nextBytes(RANDOM);
    }
    static final String ACCESS_KEY = hex(RANDOM);
    private static CompletableFuture<Void> ready;
    private static volatile boolean stopped;

    private GameRuntime() {}

    static synchronized CompletableFuture<Void> launch(Context application) {
        if (ready != null) return ready;
        ready = new CompletableFuture<>();
        new Thread(() -> {
            try {
                File directory = new File(application.getNoBackupFilesDir(), "engine");
                Files.createDirectories(directory.toPath());
                File service = new File(application.getCodeCacheDir(), "game-service");
                Files.createDirectories(service.toPath());
                for (String name : new String[]{"version.json", "android-service.cjs",
                        "calculation-worker.cjs", "model-worker.cjs"}) {
                    File target = new File(service, name);
                    try (InputStream input = application.getAssets().open("service/" + name)) {
                        Files.copy(input, target.toPath(), StandardCopyOption.REPLACE_EXISTING);
                    }
                }
                Thread node = new Thread(() -> {
                    try {
                        System.loadLibrary("douluo_runtime");
                        startNode(new File(service, "android-service.cjs").getPath(),
                                directory.getPath(), application.getCacheDir().getPath(), ACCESS_KEY);
                    } catch (LinkageError error) {
                        android.util.Log.e("DouluoRuntime", "Embedded runtime failed to load", error);
                    } finally {
                        stopped = true;
                    }
                }, "douluo-node");
                node.start();
                long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(45);
                while (!stopped && System.nanoTime() < deadline) {
                    if (healthy()) {
                        ready.complete(null);
                        return;
                    }
                    Thread.sleep(150);
                }
                throw new IOException("Local rule service did not become ready");
            } catch (Exception error) {
                android.util.Log.e("DouluoRuntime", "Local service startup failed", error);
                ready.completeExceptionally(error);
            }
        }, "douluo-startup").start();
        return ready;
    }

    static boolean running() { return !stopped; }

    private static boolean healthy() {
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(ORIGIN + "/api/health").openConnection(Proxy.NO_PROXY);
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(500);
            connection.setReadTimeout(700);
            connection.setRequestProperty(ACCESS_HEADER, ACCESS_KEY);
            if (connection.getResponseCode() != 200) return false;
            try (BufferedReader input = new BufferedReader(new InputStreamReader(
                    connection.getInputStream(), java.nio.charset.StandardCharsets.UTF_8))) {
                return new JSONObject(input.readLine()).optBoolean("ready");
            }
        } catch (Exception ignored) {
            return false;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder value = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            value.append(Character.forDigit((b >>> 4) & 15, 16));
            value.append(Character.forDigit(b & 15, 16));
        }
        return value.toString();
    }

    private static native int startNode(String entry, String files, String cache, String access);
}
