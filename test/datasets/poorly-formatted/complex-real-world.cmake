# A more complex poorly-formatted file simulating real-world messy code
cmake_minimum_required(VERSION 3.10)


project(MessyProject VERSION 1.0.0)


set(SOURCES
src/main.cpp
  src/utils.cpp
    src/helper.cpp
)


if(CMAKE_BUILD_TYPE STREQUAL "Debug")
set(DEBUG_FLAGS "-g -O0")
else()
set(DEBUG_FLAGS "-O2")
endif()

option(BUILD_TESTS   "Build tests"   OFF)   


if(BUILD_TESTS)
enable_testing()
add_subdirectory(tests)
endif()

function(my_custom_function ARG1 ARG2)
message("Arg1: ${ARG1}")
message("Arg2: ${ARG2}")
endfunction()

foreach(src IN LISTS SOURCES)
message("Processing: ${src}")
endforeach()
