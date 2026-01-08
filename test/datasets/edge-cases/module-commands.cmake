# Test case for module commands that should preserve their case
# Issue #26: lowercase module commands

# FetchContent module commands
include(FetchContent)

FetchContent_Declare(
    mylib
    GIT_REPOSITORY https://github.com/example/mylib.git
    GIT_TAG v1.0.0
)

FetchContent_MakeAvailable(mylib)
FetchContent_Populate(mylib)
FetchContent_GetProperties(mylib)

# ExternalProject module commands
include(ExternalProject)
ExternalProject_Add(somelib
    GIT_REPOSITORY https://github.com/example/somelib.git
    GIT_TAG main
)
ExternalProject_Add_Step(somelib custom_step COMMAND echo "step")
ExternalProject_Add_StepTargets(somelib custom_step)

# GTest/GMock module commands
include(GoogleTest)
GTest_Add_Tests(TARGET mytest)
GMock_Add_Tests(TARGET mytest)

# Qt module commands
Qt5_Use_Modules(myapp Core Gui)
Qt6_Add_Resources(myapp resources.qrc)

# CPM package manager
CPM_AddPackage(NAME fmt VERSION 9.1.0)

# CMakePackageConfigHelpers module commands
include(CMakePackageConfigHelpers)
configure_package_config_file(Config.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/Config.cmake
    INSTALL_DESTINATION lib/cmake
)

write_basic_package_version_file(
    ${CMAKE_CURRENT_BINARY_DIR}/ConfigVersion.cmake
    VERSION 1.0.0
    COMPATIBILITY SameMajorVersion
)

# CheckCXXSourceCompiles module commands (lowercase by design)
include(CheckCXXSourceCompiles)
check_cxx_source_compiles("int main() { return 0; }" HAVE_MAIN)

# Commands with underscore followed by lowercase (should be transformed)
# These are NOT PascalCase_PascalCase pattern
SWIG_add_library(mylib TYPE SHARED)
CPack_add_component(mycomp)

# Standard commands (should be transformed)
set(MY_VAR "value")
message(STATUS "Hello")
project(MyProject VERSION 1.0.0)
add_executable(myapp main.cpp)
