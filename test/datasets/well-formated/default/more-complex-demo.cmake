cmake_minimum_required(VERSION 3.17)

if (NOT DEFINED CMAKE_POLICY_VERSION_MINIMUM)
    set(CMAKE_POLICY_VERSION_MINIMUM 3.5)
endif ()

# Currently only x86_64 target is supported on macOS
if (NOT DEFINED CMAKE_OSX_ARCHITECTURES)
    set(CMAKE_OSX_ARCHITECTURES "x86_64" CACHE STRING "")
endif ()

set(CMAKE_OSX_DEPLOYMENT_TARGET "11.0.1" CACHE STRING "Minimum OS X deployment version")

cmake_policy(SET CMP0079 NEW)

project(example-app LANGUAGES CXX)

# Feature editor mode, enabled by default
option(USE_FEATURE_EDIT "Enable feature editor." OFF)
set(USE_FEATURE_EDIT ON CACHE BOOL "Enable feature editor" FORCE)
option(GRAPHICS_ENABLE_STATISTICS_HOOK "enable Statistics Hook" OFF)

if (USE_FEATURE_EDIT)
    add_definitions(-DFEATURE_EDIT)
endif ()

if (GRAPHICS_ENABLE_STATISTICS_HOOK)
    add_definitions(-DGRAPHICS_STATISTICS_ENABLED=1)
endif ()

if (CMAKE_BUILD_TYPE STREQUAL "")
    message("CMAKE_BUILD_TYPE=\"${CMAKE_BUILD_TYPE}\, set to Debug")
    set(CMAKE_BUILD_TYPE "Debug")
endif ()

if (APPLE)
    set(USE_MAC_BUNDLE_DEFAULT ON)
    set(USE_METAL_DEFAULT ON)
else ()
    set(USE_MAC_BUNDLE_DEFAULT OFF)
    set(USE_METAL_DEFAULT OFF)
endif ()

option(APP_INTERACTION_DISPLAY_ONLY "Enable display interaction only, remove other modules." OFF)

if (NOT DEFINED BUILD_SHARED_LIBS)
    set(BUILD_SHARED_LIBS OFF CACHE BOOL "Build shared libraries." FORCE)
endif ()

if (NOT ENABLE_GRAPHICS_WINDOW)
    set(ENABLE_GRAPHICS_WINDOW ON CACHE BOOL "Enable graphics window." FORCE)
endif ()

if (MSVC)
    find_package(Vulkan QUIET)
    if (NOT Vulkan_FOUND)
        set(USE_VULKAN_DEFAULT OFF)
    else ()
        set(USE_VULKAN_DEFAULT ON)
    endif ()
else ()
    set(USE_VULKAN_DEFAULT ON)
endif ()
option(USE_VULKAN "Enable vulkan renderer." ${USE_VULKAN_DEFAULT})
option(USE_METAL "Enable Metal renderer" ${USE_METAL_DEFAULT})
option(USE_MAC_BUNDLE "Enable APP Bundle." ${USE_MAC_BUNDLE_DEFAULT})

option(USE_DESKTOP_GL "Enable Desktop OpenGL (Higher priority than USE_ANGLE)." ON)
option(ENABLE_ASAN "ENABLE ASAN" OFF)

set(ROOT_DIR ${CMAKE_CURRENT_SOURCE_DIR})
set(DEMO_SDK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/dep/ExampleSDK)
set(DEMO_ENGINE_DIR "${DEMO_SDK_DIR}/dependencies/graphics-engine")
set(GRAPHICS_DIR "${DEMO_ENGINE_DIR}/3rdparty/graphics-framework")

set(APP_ENABLE_TERMINAL_DEMO OFF CACHE INTERNAL "")
set(ENABLE_GRAPHICS_VULKAN_LIBRARY_LOADING ON CACHE BOOL "Enable Vulkan Load Library" FORCE)

if (USE_DESKTOP_GL)
    set(USE_ANGLE OFF CACHE INTERNAL "")
    set(USE_EGL OFF CACHE INTERNAL "")
else ()
    set(USE_ANGLE ON CACHE INTERNAL "")
    set(USE_EGL ON CACHE INTERNAL "")
endif ()

set(ENGINE_STATIC_LIB ON CACHE INTERNAL "")

set(USE_RENDERER ON CACHE INTERNAL "")
set(USE_QT ON CACHE INTERNAL "")
set(USE_RG ON CACHE INTERNAL "")
# set(ENGINE_NO_FFMPEG_VIDEO_MODULE ON CACHE INTERNAL "")

# Define macro to prevent automatic data cleanup per frame, define EXAMPLE_FEATURE_QT as static library
add_definitions(-DEXAMPLE_FEATURE_QT_STATIC=1)

# ExampleSDK
add_subdirectory(${DEMO_SDK_DIR})

# graphics-framework doesn't need separate stb_image reference, as astc encoder already includes it.
target_compile_definitions(graphics-framework PRIVATE -DDISABLE_STB_IMAGE_IMPLEMENTATION=1)

# Utilities
include(${CMAKE_CURRENT_SOURCE_DIR}/dep/Utilities/Utilities.cmake)

# ### ml-toolkit begin
if (USE_DESKTOP_GL)
    execute_process(COMMAND bash load_deps.sh --no-angle WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})
else ()
    execute_process(COMMAND bash load_deps.sh WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR})
endif ()


set(ML_TOOLKIT_DIR ${CMAKE_CURRENT_SOURCE_DIR}/dep/ml-toolkit)
include(${ML_TOOLKIT_DIR}/ml_toolkit_lib.cmake)

# Workaround for CMake documentation inconsistency
if (WIN32)
    get_target_property(ML_TOOLKIT_LOCATION_DEBUG ml_toolkit_lib IMPORTED_IMPLIB_DEBUG)
    get_target_property(ML_TOOLKIT_LOCATION_RELEASE ml_toolkit_lib IMPORTED_IMPLIB_RELEASE)
    set_target_properties(ml_toolkit_lib PROPERTIES
        IMPORTED_LOCATION_DEBUG ${ML_TOOLKIT_LOCATION_DEBUG}
        IMPORTED_LOCATION_RELEASE ${ML_TOOLKIT_LOCATION_RELEASE}
    )
endif ()

set(ML_FRAMEWORK_DIR ${CMAKE_CURRENT_SOURCE_DIR}/dep/ml-framework)
include(${ML_FRAMEWORK_DIR}/ml_framework.cmake)

# workaround
project(example-app LANGUAGES CXX)

set(FEATURE_RESOURCE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/resource/feature_test_resource)
if (NOT EXISTS ${FEATURE_RESOURCE_DIR})
    execute_process(COMMAND bash -l -c "git clone https://github.com/example/feature-effects.git feature_test_resource"
        WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/resource
    )
endif ()

# ## ml-toolkit end

# Setup GLFW dependency
include(${GRAPHICS_DIR}/utils/findGLFW.cmake)

# Setup Qt dependency
include(${GRAPHICS_DIR}/utils/findQt.cmake)

set(CMAKE_AUTOUIC ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)

set(CMAKE_INCLUDE_CURRENT_DIR ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -DDEBUG=1")

if (EXISTS ${CMAKE_CURRENT_SOURCE_DIR}/local.cmake)
    include(${CMAKE_CURRENT_SOURCE_DIR}/local.cmake)
endif ()

if (APP_INTERACTION_DISPLAY_ONLY)
    add_definitions(-DAPP_INTERACTION_DISPLAY_ONLY=1)
endif ()

if (USE_GLEW)
    add_definitions(-DGLEW_USED=1)
endif ()

if (USE_DESKTOP_GL)
    set(DEMO_COMMON_DEFINES
        -DEXAMPLE_FEATURE_GLEW=1
        -DEXAMPLE_QT_WITH_GLEW=1
        -DGRAPHICS_COMPILE_WITH_DESKTOP_GL=1
    )
    if (USE_GLEW)
        include_directories(
            ${DEMO_SDK_DIR}/platform/glew/compiledDependencies
            ${DEMO_SDK_DIR}/platform/glew/compiledDependencies/graphics-engine)
    endif ()

    if (APPLE)
        set(DEMO_GLEW_REQUIREMENTS
            ${DEMO_GLEW_REQUIREMENTS}
            "-framework OpenGL")
    endif ()
else ()
    set(DEMO_COMMON_DEFINES
        -DEXAMPLE_QT_WITH_ANGLE=1
        -DGRAPHICS_COMPILE_WITH_EGL=1
        -DEXAMPLE_FEATURE_EGL=1
    )
    include_directories(
        ${DEMO_SDK_DIR}/dependencies/angle/include
        ${DEMO_SDK_DIR}/platform/qt
    )
endif ()

include_directories(
    ${DEMO_SDK_DIR}/platform/qt/compiledDependencies
    ${DEMO_SDK_DIR}/platform/qt/compiledDependencies/graphics-engine)

if (ENABLE_ASAN)
    add_definitions(-DENABLE_ASAN=1)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fsanitize=address -fno-omit-frame-pointer")
endif ()

add_definitions(
    -DAPPLICATION_IDENTIFIER="com.example.example-app"
    -DENGINE_ENABLE_NEW_RENDER_API=1
    -DLIBENGINE4QT_LIB=1
    -DDEMO_RESOURCE_ROOT_DIR=${CMAKE_CURRENT_SOURCE_DIR}/resource
    -DDEMO_ML_MODEL_DIR=${CMAKE_CURRENT_SOURCE_DIR}/dep/ml-models
    ${DEMO_COMMON_DEFINES}
)

include_directories(
    ${CMAKE_CURRENT_SOURCE_DIR}/src
    ${CMAKE_CURRENT_SOURCE_DIR}/src/macos
    ${CMAKE_CURRENT_SOURCE_DIR}/src/display
    ${CMAKE_CURRENT_SOURCE_DIR}/src/feature
    ${CMAKE_CURRENT_SOURCE_DIR}/src/opengl
    ${CMAKE_CURRENT_SOURCE_DIR}/src/utils
    ${CMAKE_CURRENT_SOURCE_DIR}/src/vulkan
    ${DEMO_SDK_DIR}/dependencies
    ${DEMO_SDK_DIR}/dependencies/eigen/include/eigen3
    ${DEMO_ENGINE_DIR}/tests
    ${DEMO_ENGINE_DIR}/tests/ui
    ${DEMO_SDK_DIR}/graphics_tests
    ${DEMO_SDK_DIR}/graphics_tests/shaders
)

file(GLOB_RECURSE MY_SOURCE_QT "${CMAKE_CURRENT_SOURCE_DIR}/src/*.cpp"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/*.h"
)

list(APPEND MY_SOURCE_QT ${UTILITIES_CODE_SOURCE})

if (APP_INTERACTION_DISPLAY_ONLY)
    # If APP_INTERACTION_DISPLAY_ONLY is enabled,
    # remove unnecessary files from MY_SOURCE_QT
    file(GLOB_RECURSE MY_SOURCE_NOT_DISPLAY
        "${CMAKE_CURRENT_SOURCE_DIR}/src/feature/*"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/MainWindow.*"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/EngineMainWindow.*")
    list(REMOVE_ITEM MY_SOURCE_QT ${MY_SOURCE_NOT_DISPLAY})
endif ()

file(GLOB_RECURSE ENGINE_TEST_SOURCE
    "${DEMO_ENGINE_DIR}/tests/*.cpp"
    "${DEMO_ENGINE_DIR}/tests/*.h")

file(GLOB_RECURSE SDK_TEST_SOURCE
    "${DEMO_ENGINE_DIR}/tests/*.cpp"
    "${DEMO_ENGINE_DIR}/tests/*.h"
    "${DEMO_SDK_DIR}/graphics_tests/*.cpp"
    "${DEMO_SDK_DIR}/graphics_tests/*.h")

if (APPLE)
    file(GLOB_RECURSE DEMO_SOURCE_OBJC
        "${CMAKE_CURRENT_SOURCE_DIR}/src/*.mm"
        "${DEMO_ENGINE_DIR}/tests/*.mm"
    )
endif ()

if (NOT USE_DESKTOP_GL)
    set(ENGINE_ANGLE_CONTEXT_SOURCE ${DEMO_ENGINE_DIR}/egl/AngleGLContext.cpp)

    if (NOT DEFINED LIB_EGL)
        set(ANGLE_BIN_PATH ${DEMO_SDK_DIR}/dependencies/angle/osx)
        FIND_LIBRARY(LIB_EGL libEGL.dylib PATHS ${ANGLE_BIN_PATH} NO_DEFAULT_PATH)
        FIND_LIBRARY(LIB_GLES2 libGLESv2.dylib PATHS ${ANGLE_BIN_PATH} NO_DEFAULT_PATH)
        link_directories(${ANGLE_BIN_PATH})
    endif ()

    # message(FATAL_ERROR "LIB_GLES2=${LIB_GLES2}")
    # message(FATAL_ERROR "LIB_EGL=${LIB_EGL}")
endif ()

source_group(TREE ${ROOT_DIR} FILES ${MY_SOURCE_QT})
source_group(TREE ${DEMO_ENGINE_DIR} FILES ${ENGINE_TEST_SOURCE})
source_group(TREE ${DEMO_SDK_DIR} FILES ${SDK_TEST_SOURCE})

if (NOT APP_DEMO_CI_GTEST)
    if (USE_MAC_BUNDLE)
        # Setup application icon
        if (EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/icon.icns")
            set(MACOSX_BUNDLE_ICON_FILE icon.icns)
            set(MY_ICON_FILE ${CMAKE_CURRENT_SOURCE_DIR}/icon.icns)
            set_source_files_properties(${MY_ICON_FILE} PROPERTIES MACOSX_PACKAGE_LOCATION "Resources")
        endif ()

        add_executable(example-app MACOSX_BUNDLE
            ${MY_ICON_FILE} # app icon
            ${MY_SOURCE_QT}
            ${SDK_TEST_SOURCE}
            ${ENGINE_TEST_SOURCE}
            ${ENGINE_ANGLE_CONTEXT_SOURCE}
            ${DEMO_SOURCE_OBJC}
        )
    else ()
        if (EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/icon.rc")
            # enable_language("RC")
            set(MY_ICON_RC "${CMAKE_CURRENT_SOURCE_DIR}/icon.rc")
            # set_source_files_properties(${MY_ICON_RC} PROPERTIES LANGUAGE RC)
        endif ()

        add_executable(example-app
            ${MY_ICON_RC} # windows icon
            ${MY_SOURCE_QT}
            ${SDK_TEST_SOURCE}
            ${ENGINE_TEST_SOURCE}
            ${ENGINE_ANGLE_CONTEXT_SOURCE}
            ${DEMO_SOURCE_OBJC}
        )
    endif ()

    if (NOT APP_INTERACTION_DISPLAY_ONLY)
        target_link_libraries(example-app PRIVATE graphics-framework-window)
    endif ()

    include_directories(${DEMO_ENGINE_DIR}/3rdparty)

    # for MacOS
    if (APPLE)
        set_target_properties(example-app PROPERTIES
            XCODE_GENERATE_SCHEME ON
            XCODE_ATTRIBUTE_CODE_SIGN_IDENTITY ""
        )
    endif ()

    if (APPLE)
        set(DEMO_SYSTEM_FRAMEWORKS
            "-framework IOSurface"
            "-framework Metal"
            "-framework MetalKit"
            "-framework QuartzCore"
            "-framework CoreMedia"
            "-framework Foundation"
            "-framework AppKit"
            "-framework AVFoundation"
            "-framework Accelerate"
            "-framework JavaScriptCore"
            "-framework AudioToolbox"
            "-framework Security"
            "-framework VideoToolbox"
        )
    endif ()

    find_package(${QT} COMPONENTS Core Widgets Gui Network REQUIRED)
    set(QT_LIBS ${QT}::Core ${QT}::Widgets ${QT}::Gui ${QT}::Network)

    if (${QT_VERSION} GREATER_EQUAL 6)
        # Add openglwidgets component for Qt version >= 6
        find_package(${QT} COMPONENTS openglwidgets REQUIRED)
        set(QT_LIBS ${QT_LIBS} ${QT}::OpenGLWidgets)
    endif ()

    target_link_libraries(example-app PRIVATE
        ExampleSDK
        ml_toolkit_lib
        ml_framework
        opencv
        glfw
        libPNG
        ${QT_LIBS}
        ${LIB_EGL}
        ${LIB_GLES}
        ${LIB_GLES2}
        ${DEMO_GLEW_REQUIREMENTS}
        ${VK_STATIC_LIB}
        ${DEMO_SYSTEM_FRAMEWORKS}
    )

    if (WIN32)
        target_link_libraries(example-app PRIVATE
            vfw32
            ws2_32
            opengl32
        )
    endif ()

    if (USE_METAL)
        target_compile_options(example-app PUBLIC "-fobjc-arc")
        target_compile_definitions(example-app PUBLIC ENGINE_COMPILE_WITH_METAL)
    endif ()

    if (USE_MAC_BUNDLE)
        set_target_properties(example-app PROPERTIES MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/Info.plist)
    endif ()

    if (MSVC)
        target_compile_options(example-app PRIVATE
            /utf-8
            /MP
            /std:c++17
            /Zc:__cplusplus
            /wd4819
            /D_USE_MATH_DEFINES
            "$<$<CONFIG:DEBUG>:/DDEBUG>"
            "$<$<CONFIG:RELEASE>:/DNDEBUG>"
            "$<$<CONFIG:RELWITHDEBINFO>:/DNDEBUG>"
            "$<$<CONFIG:MINSIZEREL>:/DNDEBUG>"
            "$<IF:$<CONFIG:Debug>,/MDd,/MD>"
        )
        file(GLOB DLL_LIBS
            "${DEMO_ENGINE_DIR}/3rdparty/graphics-framework/3rdparty/glew-win32/bin/Release/x64/*.dll"
            "${DEMO_ENGINE_DIR}/3rdparty/ScriptRuntime/*.dll"
            "${DEMO_ENGINE_DIR}/3rdparty/script-engine/js-core/v8_win/shared_libs/*.dll"
        )

        file(GLOB DLL_LIBS_DEBUG
            "${ML_TOOLKIT_DIR}/lib/win/x64/debug/*.dll"
            "${ML_FRAMEWORK_DIR}/windows/libs/x64/debug/*.dll"
        )

        if (DEFINED OPENCV_SHARED_LIBS_DEBUG)
            list(APPEND DLL_LIBS_DEBUG ${OPENCV_SHARED_LIBS_DEBUG})
        endif ()

        # message("OPENCV_SHARED_LIBS_DEBUG=${OPENCV_SHARED_LIBS_DEBUG}")

        file(GLOB DLL_LIBS_RELEASE
            "${ML_TOOLKIT_DIR}/lib/win/x64/release/*.dll"
            "${ML_FRAMEWORK_DIR}/windows/libs/x64/release/*.dll"
        )

        if (DEFINED OPENCV_SHARED_LIBS_RELEASE)
            list(APPEND DLL_LIBS_RELEASE ${OPENCV_SHARED_LIBS_RELEASE})
        endif ()

        file(GLOB FFMPEG_DLLS "${DEMO_ENGINE_DIR}/3rdparty/ffmpeg4windows/bin64/*.dll")
        foreach (DLL_FILE ${FFMPEG_DLLS})
            # If ends with d.dll, it's debug version, otherwise release version
            if (${DLL_FILE} MATCHES "d.dll$")
                list(APPEND DLL_LIBS_DEBUG ${DLL_FILE})
            else ()
                list(APPEND DLL_LIBS_RELEASE ${DLL_FILE})
            endif ()
        endforeach ()

        set_property(DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR} PROPERTY VS_STARTUP_PROJECT example-app)

        foreach (DLL_FILE ${DLL_LIBS})
            add_custom_command(TARGET example-app POST_BUILD
                COMMAND ${CMAKE_COMMAND} -E copy_if_different ${DLL_FILE} $<TARGET_FILE_DIR:example-app>
                COMMENT "Copying ${DLL_FILE}"
            )
        endforeach ()

        # ref <https://stackoverflow.com/questions/1620006/post-build-step-only-for-release-build>

        # Copy debug DLLs only in debug mode
        foreach (DLL_FILE ${DLL_LIBS_DEBUG})
            add_custom_command(TARGET example-app POST_BUILD
                COMMAND cmd.exe /c if "$(Configuration)" == "Debug"
                ${CMAKE_COMMAND} -E copy_if_different ${DLL_FILE} $<TARGET_FILE_DIR:example-app>
                COMMENT "Copying Debug: ${DLL_FILE} -- $<TARGET_FILE_DIR:example-app>"
            )
        endforeach ()

        # Copy release DLLs only in release mode
        foreach (DLL_FILE ${DLL_LIBS_RELEASE})
            add_custom_command(TARGET example-app POST_BUILD
                COMMAND cmd.exe /c if not "$(Configuration)" == "Debug"
                ${CMAKE_COMMAND} -E copy_if_different ${DLL_FILE} $<TARGET_FILE_DIR:example-app>
                COMMENT "Copying Non-Debug: ${DLL_FILE} -- $<TARGET_FILE_DIR:example-app>"
            )
        endforeach ()

        # Create symlink from ${CMAKE_CURRENT_SOURCE_DIR}/dep/ml-models to $<TARGET_FILE_DIR:example-app>/ml-models
        add_custom_command(TARGET example-app POST_BUILD

            # Remove existing symlink or directory first
            COMMAND ${CMAKE_COMMAND} -E remove_directory $<TARGET_FILE_DIR:example-app>/ml-models
            COMMAND ${CMAKE_COMMAND} -E create_symlink ${CMAKE_CURRENT_SOURCE_DIR}/dep/ml-models $<TARGET_FILE_DIR:example-app>/ml-models
            COMMENT "Creating symlink ml-models"
        )

        # Create symlink from ${CMAKE_CURRENT_SOURCE_DIR}/resource to $<TARGET_FILE_DIR:example-app>/resource
        add_custom_command(TARGET example-app POST_BUILD

            # Remove existing symlink or directory first
            COMMAND ${CMAKE_COMMAND} -E remove_directory $<TARGET_FILE_DIR:example-app>/resource
            COMMAND ${CMAKE_COMMAND} -E create_symlink ${CMAKE_CURRENT_SOURCE_DIR}/resource $<TARGET_FILE_DIR:example-app>/resource
            COMMENT "Creating symlink resource"
        )
    endif ()

    # Setup executable and library search paths for macOS
    if (CMAKE_SYSTEM_NAME MATCHES "Darwin")
        # NOTE: May require GLEW library
        set(glew_LIB ${CMAKE_CURRENT_SOURCE_DIR}/dep/libGLEW.2.2.dylib)
        if (NOT EXISTS ${glew_LIB})
            message(STATUS "DOWNLOAD libGLEW.2.2.dylib")
            file(DOWNLOAD
                "https://example.com/files/libGLEW.2.2.dylib"
                ${CMAKE_CURRENT_SOURCE_DIR}/dep/libGLEW.2.2.dylib
                #SHOW_PROGRESS
                INACTIVITY_TIMEOUT 10
                TIMEOUT 10
            )
        endif ()
        add_custom_command(TARGET example-app POST_BUILD
            COMMAND bash ${CMAKE_CURRENT_SOURCE_DIR}/dev_post_build.sh ${CMAKE_CURRENT_BINARY_DIR} $<CONFIG> ${DEMO_SDK_DIR}/dependencies/angle/osx ${DEV_ON_VSCODE}
        )
        set_property(TARGET example-app APPEND PROPERTY INSTALL_RPATH "@executable_path/../Frameworks")

        # Apple Silicon doesn't automatically search /usr/local/lib, add it explicitly
        if (${Vulkan_LIBRARY} MATCHES "^/usr/local/")
            set_property(TARGET example-app APPEND PROPERTY INSTALL_RPATH "/usr/local/lib")
        endif ()
    endif ()
endif ()

# Coverage support
if (ENABLE_COVERAGE)
    if (CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
        set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} --coverage -g -O0 -fprofile-arcs -ftest-coverage")
        set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} --coverage -g -O0 -fprofile-arcs -ftest-coverage")
        set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} --coverage")
        set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} --coverage")
        message(STATUS "Code coverage enabled ")

        # Find gcovr tool - try multiple common locations
        find_program(GCOVR_EXECUTABLE gcovr
            PATHS
            # User Python installations
            $ENV{HOME}/.local/bin
            $ENV{HOME}/Library/Python/*/bin
            # System Python locations
            /usr/local/bin
            /opt/homebrew/bin
            # Python version-specific paths
            /Library/Frameworks/Python.framework/Versions/*/bin
            # pip3 user install location
            ${CMAKE_CURRENT_SOURCE_DIR}/.venv/bin
            DOC "Path to gcovr executable"
        )

        if (NOT GCOVR_EXECUTABLE)
            message(WARNING "gcovr not found! Coverage reports will not be generated.")
        else ()
            message(STATUS "Found gcovr: ${GCOVR_EXECUTABLE}")
        endif ()

        # Add coverage target
        if (GCOVR_EXECUTABLE)
            add_custom_target(coverage
                COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_CURRENT_BINARY_DIR}/coverage
                COMMAND ${GCOVR_EXECUTABLE}
                --xml-pretty
                --print-summary
                -o ${CMAKE_CURRENT_BINARY_DIR}/coverage.xml
                --root ${CMAKE_CURRENT_SOURCE_DIR}
                --filter "dep/ExampleSDK/feature/effect"
                --filter "dep/ExampleSDK/feature/effect2"
                --html-details ${CMAKE_CURRENT_BINARY_DIR}/coverage/coverage.html
                ${CMAKE_CURRENT_BINARY_DIR}
                WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
                DEPENDS example-app-tests
                COMMENT "Generating code coverage report"
            )
        else ()
            add_custom_target(coverage
                COMMAND ${CMAKE_COMMAND} -E echo "ERROR: gcovr not found! Please install with: pip install gcovr"
                COMMAND ${CMAKE_COMMAND} -E echo "Make sure gcovr is in your PATH or install it with: pip3 install gcovr"
                COMMAND false
                COMMENT "Coverage target disabled - gcovr not available"
            )
        endif ()

        # Add clean coverage target
        add_custom_target(clean-coverage
            COMMAND ${CMAKE_COMMAND} -E remove_directory ${CMAKE_CURRENT_BINARY_DIR}/coverage
            COMMAND ${CMAKE_COMMAND} -E remove ${CMAKE_CURRENT_BINARY_DIR}/coverage.xml
            COMMAND find ${CMAKE_CURRENT_BINARY_DIR} -name "*.gcda" -type f -delete || true
            WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
            COMMENT "Cleaning coverage .gcda data"
        )
    else ()
        message(WARNING "Code coverage only supported with GCC or Clang compilers")
    endif ()
endif ()

if (APP_DEMO_CI_GTEST)
    add_definitions(-DAPP_DEMO_CI_GTEST)
    find_package(${QT} COMPONENTS Core Widgets Gui Network REQUIRED)
    set(QT_LIBS ${QT}::Core ${QT}::Widgets ${QT}::Gui ${QT}::Network)

    if (${QT_VERSION} GREATER_EQUAL 6)
        # Add openglwidgets component for Qt version >= 6
        find_package(${QT} COMPONENTS openglwidgets REQUIRED)
        set(QT_LIBS ${QT_LIBS} ${QT}::OpenGLWidgets)
    endif ()

    if (APPLE)
        set(DEMO_SYSTEM_FRAMEWORKS
            "-framework IOSurface"
            "-framework Metal"
            "-framework MetalKit"
            "-framework QuartzCore"
            "-framework CoreMedia"
            "-framework Foundation"
            "-framework AppKit"
            "-framework AVFoundation"
            "-framework Accelerate"
            "-framework JavaScriptCore"
            "-framework AudioToolbox"
            "-framework Security"
            "-framework VideoToolbox"
        )
    endif ()

    # Setup executable and library search paths for macOS
    if (CMAKE_SYSTEM_NAME MATCHES "Darwin")
        # NOTE: May require GLEW library
        set(glew_LIB ${CMAKE_CURRENT_SOURCE_DIR}/dep/libGLEW.2.2.dylib)
        if (NOT EXISTS ${glew_LIB})
            message(STATUS "DOWNLOAD libGLEW.2.2.dylib")
            file(DOWNLOAD
                "https://example.com/files/libGLEW.2.2.dylib"
                ${CMAKE_CURRENT_SOURCE_DIR}/dep/libGLEW.2.2.dylib
                #SHOW_PROGRESS
                INACTIVITY_TIMEOUT 10
                TIMEOUT 10
            )
        endif ()
    endif ()

    # Define separate source file variable for example-app-tests
    set(MY_SOURCE_FOR_TEST ${MY_SOURCE_QT})

    list(REMOVE_ITEM MY_SOURCE_FOR_TEST
        "${CMAKE_CURRENT_SOURCE_DIR}/src/terminal/HeadlessRender.cpp"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/terminal/HeadlessRender.h"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/terminal/FeatureTerminal.cpp"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/terminal/FeatureTerminal.h"
        "${CMAKE_CURRENT_SOURCE_DIR}/src/main.cpp"
    )

    include(FetchContent)
    FetchContent_Declare(
        googletest
        ${QT}
        GIT_REPOSITORY https://github.com/google/googletest.git
        GIT_TAG release-1.12.1
    )
    # For Windows: Prevent overriding the parent project's compiler/linker settings
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)

    # Collect all test source files
    file(GLOB_RECURSE TEST_SOURCES
        "${CMAKE_CURRENT_SOURCE_DIR}/tests/*.cpp"
        "${CMAKE_CURRENT_SOURCE_DIR}/tests/*.h"
    )

    add_executable(example-app-tests ${TEST_SOURCES} ${SDK_TEST_SOURCE}
        # Include all source files same as main app, but exclude main.cpp
        ${MY_ICON_RC} # windows icon
        ${MY_SOURCE_FOR_TEST}  # Use version without main.cpp
        ${ENGINE_TEST_SOURCE}
        ${ENGINE_ANGLE_CONTEXT_SOURCE}
        ${DEMO_SOURCE_OBJC}
    )

    include_directories(${DEMO_ENGINE_DIR}/3rdparty)

    # Link with GoogleTest and project dependencies
    target_link_libraries(example-app-tests
        PRIVATE
        gtest
        gtest_main
        ExampleSDK
        ml_toolkit_lib
        ml_framework
        opencv
        glfw
        libPNG
        ${QT_LIBS}
        ${LIB_EGL}
        ${LIB_GLES}
        ${LIB_GLES2}
        ${DEMO_GLEW_REQUIREMENTS}
        ${VK_STATIC_LIB}
        ${DEMO_SYSTEM_FRAMEWORKS}
    )

    # Set include directories for tests
    target_include_directories(example-app-tests PRIVATE
        ${CMAKE_CURRENT_SOURCE_DIR}/src
        ${CMAKE_CURRENT_SOURCE_DIR}/src/macos
        ${CMAKE_CURRENT_SOURCE_DIR}/src/display
        ${CMAKE_CURRENT_SOURCE_DIR}/src/feature
        ${CMAKE_CURRENT_SOURCE_DIR}/src/opengl
        ${CMAKE_CURRENT_SOURCE_DIR}/src/utils
        ${CMAKE_CURRENT_SOURCE_DIR}/src/vulkan
        ${CMAKE_CURRENT_SOURCE_DIR}/src/terminal
        ${DEMO_SDK_DIR}/dependencies
        ${DEMO_SDK_DIR}/dependencies/eigen/include/eigen3
        ${DEMO_ENGINE_DIR}/tests
        ${DEMO_ENGINE_DIR}/tests/ui
        ${DEMO_SDK_DIR}/graphics_tests
        ${DEMO_SDK_DIR}/graphics_tests/shaders
        ${CMAKE_CURRENT_SOURCE_DIR}/tests
        ${GRAPHICS_DIR}/platform/egl
    )

    # Apply same compile definitions as main project
    target_compile_definitions(example-app-tests PRIVATE
        -DAPPLICATION_IDENTIFIER="com.example.example-app"
        -DENGINE_ENABLE_NEW_RENDER_API=1
        -DLIBENGINE4QT_LIB=1
        -DDEMO_RESOURCE_ROOT_DIR=${CMAKE_CURRENT_SOURCE_DIR}/resource
        -DDEMO_ML_MODEL_DIR=${CMAKE_CURRENT_SOURCE_DIR}/dep/ml-models
        ${DEMO_COMMON_DEFINES}
    )

    # Apply coverage flags to test executable if coverage is enabled
    if (ENABLE_COVERAGE AND CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
        target_compile_options(example-app-tests PRIVATE --coverage -g -O0 -fprofile-arcs -ftest-coverage)
        target_link_options(example-app-tests PRIVATE --coverage)
    endif ()

    # for MacOS
    if (APPLE)
        set_target_properties(example-app-tests PROPERTIES
            XCODE_GENERATE_SCHEME ON
            XCODE_ATTRIBUTE_CODE_SIGN_IDENTITY ""
        )
    endif ()

    if (USE_METAL)
        target_compile_options(example-app-tests PUBLIC "-fobjc-arc")
        target_compile_definitions(example-app-tests PUBLIC ENGINE_COMPILE_WITH_METAL)
    endif ()

    # Setup same bundle structure as example-app
    if (USE_MAC_BUNDLE)
        set_target_properties(example-app-tests PROPERTIES
            MACOSX_BUNDLE_INFO_PLIST ${CMAKE_CURRENT_SOURCE_DIR}/Info.plist
            RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_BINARY_DIR}/example-app.app/Contents/MacOS"  # Ensure output to same directory level as example-app
        )
    endif ()

    # macOS: Setup correct rpath for example-app-tests to find dynamic libraries in Bundle
    if (CMAKE_SYSTEM_NAME MATCHES "Darwin")
        set_property(TARGET example-app-tests APPEND PROPERTY INSTALL_RPATH "@executable_path")
        set_property(TARGET example-app-tests APPEND PROPERTY INSTALL_RPATH "@executable_path/../Frameworks")
        # Apple Silicon support
        if (${Vulkan_LIBRARY} MATCHES "^/usr/local/")
            set_property(TARGET example-app-tests APPEND PROPERTY INSTALL_RPATH "/usr/local/lib")
        endif ()
    endif ()

    if (CMAKE_SYSTEM_NAME MATCHES "Darwin")
        add_custom_command(TARGET example-app-tests POST_BUILD
            COMMAND bash ${CMAKE_CURRENT_SOURCE_DIR}/dev_post_build.sh ${CMAKE_CURRENT_BINARY_DIR} $<CONFIG> ${DEMO_SDK_DIR}/dependencies/angle/osx ${DEV_ON_VSCODE}
        )
        add_custom_command(TARGET example-app-tests POST_BUILD
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
            ${DEMO_SDK_DIR}/dependencies/angle/osx/libEGL.dylib
            $<TARGET_FILE_DIR:example-app-tests>/
            COMMAND ${CMAKE_COMMAND} -E copy_if_different
            ${DEMO_SDK_DIR}/dependencies/angle/osx/libGLESv2.dylib
            $<TARGET_FILE_DIR:example-app-tests>/
            # Fix executable dependency paths
            COMMAND install_name_tool -change "./libEGL.dylib" "@executable_path/libEGL.dylib" $<TARGET_FILE:example-app-tests>
            COMMAND install_name_tool -change "./libGLESv2.dylib" "@executable_path/libGLESv2.dylib" $<TARGET_FILE:example-app-tests>
            # Fix dylib install_name
            COMMAND install_name_tool -id "@executable_path/libEGL.dylib" $<TARGET_FILE_DIR:example-app-tests>/libEGL.dylib
            COMMAND install_name_tool -id "@executable_path/libGLESv2.dylib" $<TARGET_FILE_DIR:example-app-tests>/libGLESv2.dylib
        )
    endif ()

    message(STATUS "GoogleTest enabled with test files found")

endif ()
