# Test case for module commands with lowercase commandCase setting
# Module commands should preserve their PascalCase naming

# FetchContent module commands (preserve case)
include(FetchContent)

FetchContent_Declare(
        mylib
        GIT_REPOSITORY https://github.com/example/mylib.git
        GIT_TAG v1.0.0
)

FetchContent_MakeAvailable(mylib)
FetchContent_Populate(mylib)
FetchContent_GetProperties(mylib)

# ExternalProject module commands (preserve case)
include(ExternalProject)

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
include(GoogleTest)
GTest_Add_Tests(TARGET mytest)
GMock_Add_Tests(TARGET mocktest)

# Qt module commands (preserve case)
Qt5_Use_Modules(myapp Core Gui)
Qt6_Add_Resources(myapp resources.qrc)

# CPM package manager (preserve case)
CPM_AddPackage(NAME fmt VERSION 9.1.0)

# CMakePackageConfigHelpers module (lowercase command by design)
include(CMakePackageConfigHelpers)

configure_package_config_file(
        Config.cmake.in
        ${CMAKE_CURRENT_BINARY_DIR}/Config.cmake
        INSTALL_DESTINATION lib/cmake
)

write_basic_package_version_file(
        ${CMAKE_CURRENT_BINARY_DIR}/ConfigVersion.cmake
        VERSION 1.0.0
        COMPATIBILITY SameMajorVersion
)

# CheckCXXSourceCompiles module (lowercase command by design)
include(CheckCXXSourceCompiles)
check_cxx_source_compiles("int main() { return 0; }" HAVE_MAIN)

# Commands with underscore followed by lowercase (should be lowercase)
swig_add_library(mylib TYPE SHARED)
cpack_add_component(mycomp)

# Standard commands should be lowercase
set(MY_VAR "value")
message(STATUS "Hello from module commands test")
project(MyProject VERSION 1.0.0)
add_executable(myapp main.cpp)
target_link_libraries(myapp PRIVATE mylib somelib)
