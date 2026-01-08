# Test case for module commands with uppercase commandCase setting
# Module commands should preserve their PascalCase naming

# FetchContent module commands (preserve case)
INCLUDE(FetchContent)

FetchContent_Declare(
        mylib
        GIT_REPOSITORY https://github.com/example/mylib.git
        GIT_TAG v1.0.0
)

FetchContent_MakeAvailable(mylib)
FetchContent_Populate(mylib)
FetchContent_GetProperties(mylib)

# ExternalProject module commands (preserve case)
INCLUDE(ExternalProject)

ExternalProject_Add(
        somelib
        GIT_REPOSITORY https://github.com/example/somelib.git
        GIT_TAG main
)

ExternalProject_Add_Step(
        somelib
        custom_step
        COMMAND ${CMAKE_COMMAND} -E echo "Custom step"
)

# GTest/GMock module commands (preserve case)
INCLUDE(GoogleTest)
GTest_Add_Tests(TARGET mytest)
GMock_Add_Tests(TARGET mocktest)

# Qt module commands (preserve case)
Qt5_Use_Modules(myapp Core Gui)
Qt6_Add_Resources(myapp resources.qrc)

# CPM package manager (preserve case)
CPM_AddPackage(NAME fmt VERSION 9.1.0)

# CMakePackageConfigHelpers module (lowercase command by design)
INCLUDE(CMakePackageConfigHelpers)

CONFIGURE_PACKAGE_CONFIG_FILE(
        Config.cmake.in
        ${CMAKE_CURRENT_BINARY_DIR}/Config.cmake
        INSTALL_DESTINATION lib/cmake
)

WRITE_BASIC_PACKAGE_VERSION_FILE(
        ${CMAKE_CURRENT_BINARY_DIR}/ConfigVersion.cmake
        VERSION 1.0.0
        COMPATIBILITY SameMajorVersion
)

# CheckCXXSourceCompiles module (lowercase command by design)
INCLUDE(CheckCXXSourceCompiles)
CHECK_CXX_SOURCE_COMPILES("int main() { return 0; }" HAVE_MAIN)

# Commands with underscore followed by lowercase (should be uppercase)
SWIG_ADD_LIBRARY(mylib TYPE SHARED)
CPACK_ADD_COMPONENT(mycomp)

# Standard commands should be uppercase
SET(MY_VAR "value")
MESSAGE(STATUS "Hello from module commands test")
PROJECT(MyProject VERSION 1.0.0)
ADD_EXECUTABLE(myapp main.cpp)
TARGET_LINK_LIBRARIES(myapp PRIVATE mylib somelib)
