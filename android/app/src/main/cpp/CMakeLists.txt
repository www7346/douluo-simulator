cmake_minimum_required(VERSION 3.22.1)
project(douluo_runtime LANGUAGES CXX)

set(NODE_ANDROID "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../build/android/node")
add_library(node SHARED IMPORTED)
set_target_properties(node PROPERTIES
    IMPORTED_LOCATION "${NODE_ANDROID}/lib/${ANDROID_ABI}/libnode.so"
)
add_library(douluo_runtime SHARED runtime.cpp)
target_include_directories(douluo_runtime SYSTEM PRIVATE "${NODE_ANDROID}/include/node")
target_compile_features(douluo_runtime PRIVATE cxx_std_20)
target_link_libraries(douluo_runtime PRIVATE node)
