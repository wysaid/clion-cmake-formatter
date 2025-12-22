cmake_minimum_required(VERSION 3.10)
project(LowercaseStyle)

option(BUILD_TESTS "Build tests" OFF)

if (CMAKE_BUILD_TYPE STREQUAL "Debug")
    message("Debug build")
    set(DEBUG_VAR "value")
endif ()

foreach (item IN ITEMS a b c)
    message("Item: ${item}")
endforeach ()

function(my_function ARG1 ARG2)
    message("Arg1: ${ARG1}")
    message("Arg2: ${ARG2}")
endfunction()

add_executable(myapp main.cpp)
target_link_libraries(myapp PRIVATE somelib)
