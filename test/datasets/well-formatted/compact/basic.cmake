cmake_minimum_required(VERSION 3.10)
project(CompactStyle)

if(CMAKE_BUILD_TYPE STREQUAL "Debug")
    message("Debug build")
endif()

foreach(item IN ITEMS a b c)
    message("Item: ${item}")
endforeach()
