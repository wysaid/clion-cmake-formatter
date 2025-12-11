cmake_minimum_required(VERSION 3.13)

# ref: <https://github.com/x-ege/ege-vscode-plugin/tree/master/cmake_template>

if (CMAKE_HOST_UNIX)
    set(CMAKE_SYSTEM_NAME Windows)
    set(TOOLCHAIN_PREFIX x86_64-w64-mingw32)

    # cross compilers to use for C, C++ and RC
    set(CMAKE_C_COMPILER ${TOOLCHAIN_PREFIX}-gcc)
    set(CMAKE_CXX_COMPILER ${TOOLCHAIN_PREFIX}-g++)
    set(CMAKE_RC_COMPILER ${TOOLCHAIN_PREFIX}-windres)

    # modify default behavior of FIND_XXX() commands
    set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
    set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
    set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
    set(PKG_CONFIG_EXECUTABLE ${TOOLCHAIN_PREFIX}-pkg-config)
endif ()

set(MY_PROJECT_NAME ege-demo)
set(MY_TARGET_NAME ege-demo)

project(${MY_PROJECT_NAME} LANGUAGES CXX)

file(GLOB DEMO_SOURCE ${CMAKE_CURRENT_SOURCE_DIR}/*.cpp)

message("DEMO_SOURCE: ${DEMO_SOURCE}")

add_executable(${MY_TARGET_NAME} ${DEMO_SOURCE})

target_include_directories(${MY_TARGET_NAME} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/ege/include)

# Set static library search path
if (MSVC)
    # Set MSVC compile options, use C++17 standard when version is greater than vs2019.
    set(CPP_COMPILE_OPTIONS "/std:c++17")

    if (MSVC_VERSION GREATER_EQUAL 1950)
        # For vs2026 and above, static libraries are compatible.
        if (CMAKE_CL_64)
            set(osLibDir "vs2026/x64")
        else ()
            set(osLibDir "vs2026/x86")
        endif ()
    elseif (MSVC_VERSION GREATER_EQUAL 1930)
        # For vs2022 and above, static libraries are compatible.
        if (CMAKE_CL_64)
            set(osLibDir "vs2022/x64")
        else ()
            set(osLibDir "vs2022/x86")
        endif ()
    elseif (MSVC_VERSION GREATER_EQUAL 1920)
        # For vs2019 and above, static libraries are compatible.
        if (CMAKE_CL_64)
            set(osLibDir "vs2019/x64")
        else ()
            set(osLibDir "vs2019/x86")
        endif ()
    elseif (MSVC_VERSION GREATER_EQUAL 1910)
        # vs2017
        if (CMAKE_CL_64)
            set(osLibDir "vs2017/x64")
        else ()
            set(osLibDir "vs2017/x86")
        endif ()

        # Set MSVC compile options, use C++14 standard for vs2017.
        set(CPP_COMPILE_OPTIONS "/std:c++14")
    elseif (MSVC_VERSION GREATER_EQUAL 1900)
        # vs2015
        if (CMAKE_CL_64)
            set(osLibDir "vs2015/amd64")
        else ()
            set(osLibDir "vs2015")
        endif ()

        # Set MSVC compile options, use C++14 standard for vs2015.
        set(CPP_COMPILE_OPTIONS "/std:c++14")
    elseif (MSVC_VERSION GREATER_EQUAL 1600)
        if (MSVC_VERSION GREATER_EQUAL 1700)
            message(WARNING "You are using vs2012/vs2013, which is not tested, please use vs2010, vs2015 or a later version of the MSVC compiler.")
        endif ()

        # vs2010
        if (CMAKE_CL_64)
            set(osLibDir "vs2010/amd64")
        else ()
            set(osLibDir "vs2010")
        endif ()

    else ()
        message(FATAL_ERROR "Your MSVC version is too old, please use vs2015 or a newer version of the MSVC compiler. Keep up with the times, don't keep using a compiler from ten years ago.")
    endif ()

    target_compile_options(${MY_TARGET_NAME} PRIVATE
        /source-charset:utf-8
        /MP
        /D__STDC_LIMIT_MACROS
        /D_USE_MATH_DEFINES
        /Zc:__cplusplus
        ${CPP_COMPILE_OPTIONS}
        "$<$<CONFIG:DEBUG>:/DDEBUG>"
        "$<$<CONFIG:RELEASE>:/DNDEBUG>"
        "$<$<CONFIG:RELWITHDEBINFO>:/DNDEBUG>"
        "$<$<CONFIG:MINSIZEREL>:/DNDEBUG>"
        "$<IF:$<CONFIG:Debug>,/MDd,/MD>")
endif ()

if (CMAKE_CXX_COMPILER_ID MATCHES "GNU")
    if (CMAKE_HOST_APPLE)
        set(osLibDir "macOS")
    elseif (CMAKE_HOST_UNIX)
        set(osLibDir "mingw-w64-debian")
    elseif (MINGW)
        set(osLibDir "mingw64")
    endif ()

    target_compile_options(${MY_TARGET_NAME} PRIVATE -D_FORTIFY_SOURCE=0)
    target_link_options(${MY_TARGET_NAME} PRIVATE -mwindows -static -static-libgcc -static-libstdc++)
    target_link_libraries(${MY_TARGET_NAME} PRIVATE graphics gdiplus gdi32 imm32 msimg32 ole32 oleaut32 winmm uuid)
endif ()

if (DEFINED osLibDir)
    message(STATUS "osLibDir: ${osLibDir}")
    target_link_directories(${MY_TARGET_NAME} PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/ege/lib/${osLibDir})
endif ()
