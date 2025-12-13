CMAKE_MINIMUM_REQUIRED(VERSION 3.24...3.28)
PROJECT(cxx_modules_simple CXX)

INCLUDE("${CMAKE_SOURCE_DIR}/../cxx-modules-rules.cmake")

ADD_EXECUTABLE(simple)
TARGET_SOURCES(simple
    PRIVATE
    main.cxx
    PRIVATE
    FILE_SET CXX_MODULES
    BASE_DIRS
    "${CMAKE_CURRENT_SOURCE_DIR}"
    FILES
    importable.cxx)
TARGET_COMPILE_FEATURES(simple PUBLIC cxx_std_20)

ADD_TEST(NAME simple COMMAND simple)
