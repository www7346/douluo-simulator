#include <jni.h>
#include <node.h>
#include <cstdlib>
#include <string>
#include <vector>

namespace {
std::string java_string(JNIEnv* env, jstring value) {
    const char* bytes = env->GetStringUTFChars(value, nullptr);
    if (!bytes) return {};
    std::string result(bytes);
    env->ReleaseStringUTFChars(value, bytes);
    return result;
}
}

extern "C" JNIEXPORT jint JNICALL
Java_com_douluosimulator_game_GameRuntime_startNode(
        JNIEnv* env, jclass, jstring entry, jstring files, jstring cache, jstring access) {
    const auto filename = java_string(env, entry);
    const auto home = java_string(env, files);
    const auto temp = java_string(env, cache);
    const auto key = java_string(env, access);
    setenv("HOME", home.c_str(), 1);
    setenv("TMPDIR", temp.c_str(), 1);
    std::vector<std::string> args{"node", filename, home, key};
    std::vector<char*> argv;
    for (auto& arg : args) argv.push_back(arg.data());
    argv.push_back(nullptr);
    return node::Start(static_cast<int>(args.size()), argv.data());
}
