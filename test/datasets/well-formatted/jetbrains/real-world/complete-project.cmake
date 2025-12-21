cmake_minimum_required(VERSION 3.10)
project(MyProject)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Source files
set(SOURCES
        src/main.cpp
        src/utils.cpp
        src/parser.cpp
)

add_executable(myapp ${SOURCES})

if (WIN32)
    target_link_libraries(myapp ws2_32)
endif ()
