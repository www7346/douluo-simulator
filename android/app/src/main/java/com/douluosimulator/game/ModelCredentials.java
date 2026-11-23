package com.douluosimulator.game;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.util.Iterator;
import java.util.UUID;
import java.util.regex.Pattern;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import org.json.JSONArray;
import org.json.JSONObject;

final class ModelCredentials {
    private static final String ALIAS = "douluo-model-credentials";
    private static final String PREFIX = "douluo-credential-v1:disk:";
    private static final Pattern REF = Pattern.compile("douluo-credential-v1:(?:disk|session):[0-9a-f-]{36}");
    private final SharedPreferences preferences;

    ModelCredentials(Context context) {
        preferences = context.getSharedPreferences(ALIAS, Context.MODE_PRIVATE);
    }

    synchronized Object handle(String action, String data) throws Exception {
        switch (action) {
            case "seal": return seal(new JSONArray(data));
            case "resolve": return fields(new JSONObject(data), this::read);
            case "forget":
                JSONArray refs = new JSONArray(data);
                if (refs.length() > 4096) throw new IllegalArgumentException();
                SharedPreferences.Editor editor = preferences.edit();
                for (int i = 0; i < refs.length(); i++) {
                    String ref = refs.getString(i);
                    if (REF.matcher(ref).matches()) editor.remove(ref);
                }
                if (!editor.commit()) throw new IllegalStateException();
                return JSONObject.NULL;
            default: throw new IllegalArgumentException();
        }
    }

    private JSONObject seal(JSONArray profiles) throws Exception {
        if (profiles.length() > 256) throw new IllegalArgumentException();
        JSONArray result = new JSONArray();
        JSONArray created = new JSONArray();
        SharedPreferences.Editor editor = preferences.edit();
        for (int i = 0; i < profiles.length(); i++) {
            JSONObject profile = profiles.getJSONObject(i);
            result.put(fields(profile, (owner, field, value) -> {
                if (REF.matcher(value).matches()) return value;
                String ref = PREFIX + UUID.randomUUID();
                Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
                cipher.init(Cipher.ENCRYPT_MODE, key());
                cipher.updateAAD(binding(ref, owner, field));
                byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
                editor.putString(ref, encode(cipher.getIV()) + "." + encode(encrypted));
                created.put(ref);
                return ref;
            }).put("id", profile.getString("id")));
        }
        if (!editor.commit()) throw new IllegalStateException();
        return new JSONObject().put("profiles", result).put("created", created);
    }

    private String read(String owner, String field, String value) throws Exception {
        if (!REF.matcher(value).matches()) return value;
        String encoded = preferences.getString(value, "");
        String[] parts = encoded.split("\\.", -1);
        if (parts.length != 2) throw new IllegalArgumentException();
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, decode(parts[0])));
        cipher.updateAAD(binding(value, owner, field));
        return new String(cipher.doFinal(decode(parts[1])), StandardCharsets.UTF_8);
    }

    private static JSONObject fields(JSONObject profile, Transform transform) throws Exception {
        String id = profile.getString("id");
        String address = profile.getString("baseUrl");
        String transport = profile.optString("transport");
        if (id.length() > 160 || address.length() > 2048 || transport.length() > 10) {
            throw new IllegalArgumentException();
        }
        String owner = new JSONArray().put(id).put(address).put(transport).toString();
        JSONObject headers = profile.optJSONObject("credentialHeaders");
        JSONObject protectedHeaders = new JSONObject();
        if (headers != null) {
            if (headers.length() > 16) throw new IllegalArgumentException();
            for (Iterator<String> names = headers.keys(); names.hasNext();) {
                String name = names.next();
                if (!name.matches("[A-Za-z0-9!#$%&'*+.^_`|~-]{1,150}")) throw new IllegalArgumentException();
                protectedHeaders.put(name, convert(transform, owner, "header:" +
                        name.toLowerCase(java.util.Locale.ROOT), headers.getString(name)));
            }
        }
        return new JSONObject().put("apiKey", convert(transform, owner, "key",
                profile.optString("apiKey"))).put("credentialHeaders", protectedHeaders);
    }

    private static String convert(Transform transform, String owner, String field, String value) throws Exception {
        if (value.length() > 32768 || value.indexOf('\n') >= 0 || value.indexOf('\r') >= 0 ||
                value.indexOf('\0') >= 0) throw new IllegalArgumentException();
        return value.isEmpty() ? value : transform.apply(owner, field, value);
    }

    private static byte[] binding(String ref, String owner, String field) {
        return (ref + "\n" + owner + "\n" + field).getBytes(StandardCharsets.UTF_8);
    }

    private static SecretKey key() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore");
        store.load(null);
        if (store.containsAlias(ALIAS)) return (SecretKey) store.getKey(ALIAS, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(ALIAS,
                KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256)
                .build());
        return generator.generateKey();
    }

    private static byte[] decode(String value) { return Base64.decode(value, Base64.NO_WRAP); }
    private static String encode(byte[] value) { return Base64.encodeToString(value, Base64.NO_WRAP); }
    private interface Transform { String apply(String owner, String field, String value) throws Exception; }
}
