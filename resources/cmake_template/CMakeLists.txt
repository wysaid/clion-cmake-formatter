cmake_minimum_required(VERSION 3.10)
project({{PROJECT_NAME}})

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

add_executable({{PROJECT_NAME}} main.cpp)
