# Minimum CMake version
CMAKE_MINIMUM_REQUIRED(VERSION 3.10)

# Project name
PROJECT(SampleProject VERSION 1.0.0 LANGUAGES CXX)

# C++ Standard
SET(CMAKE_CXX_STANDARD 17)
SET(CMAKE_CXX_STANDARD_REQUIRED ON)

# Options
OPTION(BUILD_TESTS "Build test suite" ON)
OPTION(BUILD_EXAMPLES "Build examples" OFF)

# Source files
SET(SOURCES
    src/main.cpp
    src/utils.cpp
    src/parser.cpp
    src/formatter.cpp
)

# Header files
SET(HEADERS
    include/utils.h
    include/parser.h
    include/formatter.h
)

# Create library
ADD_LIBRARY(mylib STATIC ${SOURCES} ${HEADERS})
TARGET_INCLUDE_DIRECTORIES(mylib PUBLIC include)

# Create executable
ADD_EXECUTABLE(myapp src/main.cpp)
TARGET_LINK_LIBRARIES(myapp PRIVATE mylib)

# Platform-specific settings
IF(WIN32)
    TARGET_COMPILE_DEFINITIONS(mylib PRIVATE WINDOWS_BUILD)
    TARGET_LINK_LIBRARIES(mylib PRIVATE ws2_32)
ELSEIF(UNIX)
    TARGET_COMPILE_DEFINITIONS(mylib PRIVATE UNIX_BUILD)
    IF(APPLE)
        TARGET_COMPILE_DEFINITIONS(mylib PRIVATE MACOS_BUILD)
    ENDIF()
ENDIF()

# Build tests if requested
IF(BUILD_TESTS)
    ENABLE_TESTING()
    
    # Find test framework
    FIND_PACKAGE(GTest REQUIRED)
    
    # Test executable
    ADD_EXECUTABLE(tests
        tests/test_main.cpp
        tests/test_parser.cpp
        tests/test_formatter.cpp
    )
    
    TARGET_LINK_LIBRARIES(tests PRIVATE mylib GTest::GTest GTest::Main)
    ADD_TEST(NAME AllTests COMMAND tests)
ENDIF()

# Custom function
FUNCTION(add_my_library name)
    ADD_LIBRARY(${name} STATIC ${ARGN})
    TARGET_INCLUDE_DIRECTORIES(${name} PUBLIC include)
    SET_TARGET_PROPERTIES(${name} PROPERTIES
        CXX_STANDARD 17
        CXX_STANDARD_REQUIRED ON
    )
ENDFUNCTION()

# Use custom function
add_my_library(helpers
    src/helper1.cpp
    src/helper2.cpp
)

# Foreach example
FOREACH(src IN ITEMS main utils parser)
    MESSAGE(STATUS "Processing: ${src}")
ENDFOREACH()

# While example (uncommon but valid)
SET(counter 0)
WHILE(counter LESS 5)
    MATH(EXPR counter "${counter} + 1")
ENDWHILE()

# Install rules
INSTALL(TARGETS myapp mylib
    RUNTIME DESTINATION bin
    LIBRARY DESTINATION lib
    ARCHIVE DESTINATION lib
)

INSTALL(DIRECTORY include/
    DESTINATION include
    FILES_MATCHING PATTERN "*.h"
)

# Macro example
MACRO(print_vars)
    MESSAGE(STATUS "CMAKE_SOURCE_DIR: ${CMAKE_SOURCE_DIR}")
    MESSAGE(STATUS "CMAKE_BINARY_DIR: ${CMAKE_BINARY_DIR}")
    MESSAGE(STATUS "CMAKE_CXX_STANDARD: ${CMAKE_CXX_STANDARD}")
ENDMACRO()

print_vars()
