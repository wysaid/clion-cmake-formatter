# Creates a test named <NAME> that runs ctest --build-and-test on the
# subdirectory of this one named by replacing "." with "/" in
# <NAME>. Any arguments following NAME are passed to ctest as a
# --test-command.  See the implementation for additional details.
#
# The subdirectory is added to TEST_BUILD_DIRS in the caller's scope.
#
# Requires: the name of the project in the subdirectory is the part of
# <NAME> following the last dot ("."), or all of <NAME> if there is no
# "." in <NAME>.
MACRO(ADD_TEST_MACRO NAME)
    IF (${ARGC} GREATER 1)
        SET(_test_command --test-command ${ARGN})
    ENDIF ()
    STRING(REPLACE "." "/" dir "${NAME}")
    STRING(REGEX REPLACE "[^.]*\\." "" proj "${NAME}")
    ADD_TEST(NAME "${NAME}" COMMAND "${CMAKE_CTEST_COMMAND}"
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/${dir}"
        "${CMake_BINARY_DIR}/Tests/${dir}"
        --build-two-config
        ${build_generator_args}
        --build-project ${proj}
        ${${NAME}_CTEST_OPTIONS}
        --build-options
        ${${NAME}_BUILD_OPTIONS}
        ${_test_command})
    UNSET(_test_command)
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${dir}")
ENDMACRO()

INCLUDE(${CMAKE_CURRENT_SOURCE_DIR}/CheckFortran.cmake)
INCLUDE(${CMAKE_CURRENT_SOURCE_DIR}/CheckSwift.cmake)

# Isolate tests from user-wide configuration.
SET(TEST_HOME "${CMake_BINARY_DIR}/Tests/CMakeFiles/TestHome")
SET(TEST_CONFIG_ENV_CODE "# Isolate tests from user-wide configuration.
set(ENV{CMAKE_CONFIG_DIR} \"${TEST_HOME}/.config/cmake\")\n")
SET(TEST_INSTRUMENTATION_ENV_CODE "# Isolate tests from CTEST_USE_INSTRUMENTATION var
unset(ENV{CTEST_USE_INSTRUMENTATION})\n")
FILE(MAKE_DIRECTORY "${TEST_HOME}/.config/cmake")

# Fake a user home directory to avoid polluting the real one.
IF (NOT CTEST_NO_TEST_HOME AND (NOT WIN32 OR DEFINED ENV{HOME}))
    SET(TEST_HOME_ENV_CODE "# Fake a user home directory to avoid polluting the real one.
# But provide original ENV{HOME} value in ENV{CTEST_REAL_HOME} for tests that
# need access to the real HOME directory.
if(DEFINED ENV{HOME} AND NOT DEFINED ENV{CTEST_REAL_HOME})
  set(ENV{CTEST_REAL_HOME} \"\$ENV{HOME}\")
endif()
set(ENV{HOME} \"${TEST_HOME}\")
")
ENDIF ()

# Suppress generator deprecation warnings in test suite.
IF (CMAKE_GENERATOR MATCHES "^Visual Studio 14 2015")
    SET(TEST_WARN_VS_CODE "set(ENV{CMAKE_WARN_VS14} OFF)")
ELSE ()
    SET(TEST_WARN_VS_CODE "")
ENDIF ()

# 3.9 or later provides a definitive answer to whether we are multi-config
# through a global property. Prior to 3.9, CMAKE_CONFIGURATION_TYPES being set
# is assumed to mean multi-config, but developers might modify it so it is
# technically not as reliable.
IF (NOT CMAKE_VERSION VERSION_LESS 3.9)
    GET_PROPERTY(_isMultiConfig GLOBAL PROPERTY GENERATOR_IS_MULTI_CONFIG)
ELSEIF (CMAKE_CONFIGURATION_TYPES)
    SET(_isMultiConfig True)
ELSE ()
    SET(_isMultiConfig False)
ENDIF ()

# Choose a default configuration for CTest tests.
SET(CTestTest_CONFIG Debug)
IF (NOT _isMultiConfig AND CMAKE_BUILD_TYPE)
    SET(CTestTest_CONFIG ${CMAKE_BUILD_TYPE})
ENDIF ()

CONFIGURE_FILE(${CMake_SOURCE_DIR}/Tests/EnforceConfig.cmake.in
    ${CMake_BINARY_DIR}/Tests/EnforceConfig.cmake @ONLY)

# Testing
IF (BUILD_TESTING)
    SET(CMake_TEST_DEVENV "")
    IF (CMAKE_VS_DEVENV_COMMAND)
        SET(CMake_TEST_DEVENV "${CMAKE_VS_DEVENV_COMMAND}")
    ENDIF ()

    IF (CMAKE_GENERATOR MATCHES "Visual Studio|Xcode")
        SET(CMake_TEST_EXPLICIT_MAKE_PROGRAM "")
    ELSE ()
        SET(CMake_TEST_EXPLICIT_MAKE_PROGRAM "${CMAKE_MAKE_PROGRAM}")
    ENDIF ()

    IF (NOT CMake_TEST_EXTERNAL_CMAKE)
        IF ("${CMAKE_GENERATOR}" MATCHES "Unix Makefiles" OR ("${CMAKE_GENERATOR}" MATCHES Ninja AND NOT WIN32))
            SET(TEST_CompileCommandOutput 1)
        ENDIF ()
    ENDIF ()

    SET(MAKE_IS_GNU)
    IF (CMAKE_MAKE_PROGRAM MATCHES make)
        EXECUTE_PROCESS(COMMAND ${CMAKE_MAKE_PROGRAM} no_such_target --version
            RESULT_VARIABLE res OUTPUT_VARIABLE out ERROR_VARIABLE out)
        IF ("${res}" STREQUAL "0")
            IF ("${out}" MATCHES "GNU")
                SET(MAKE_IS_GNU 1)
            ENDIF ()
        ENDIF ()
    ENDIF ()

    # some old versions of make simply cannot handle spaces in paths
    IF (MAKE_IS_GNU OR
        CMAKE_MAKE_PROGRAM MATCHES "nmake|gmake|wmake" OR
        CMAKE_GENERATOR MATCHES "Visual Studio|Xcode|Borland|Ninja|FASTBuild")
        SET(MAKE_SUPPORTS_SPACES 1)
    ELSE ()
        SET(MAKE_SUPPORTS_SPACES 0)
    ENDIF ()

    # assume no resources building to test
    SET(CMake_TEST_RESOURCES FALSE)
    # for windows and cygwin assume we have resources
    IF (WIN32 OR CYGWIN)
        SET(CMake_TEST_RESOURCES TRUE)
    ENDIF ()
    # For some Windows toolchains there is no resource support.
    IF (WATCOM OR BORLAND OR CMAKE_C_COMPILER_ID STREQUAL "OrangeC")
        SET(CMake_TEST_RESOURCES FALSE)
    ENDIF ()

    SET(build_generator_args
        --build-generator ${CMAKE_GENERATOR}
    )
    IF (CMAKE_GENERATOR_PLATFORM)
        LIST(APPEND build_generator_args
            --build-generator-platform ${CMAKE_GENERATOR_PLATFORM}
        )
    ENDIF ()
    IF (CMAKE_GENERATOR_TOOLSET)
        LIST(APPEND build_generator_args
            --build-generator-toolset ${CMAKE_GENERATOR_TOOLSET}
        )
    ENDIF ()

    IF (CMake_TEST_EXPLICIT_MAKE_PROGRAM)
        LIST(APPEND build_generator_args
            --build-makeprogram ${CMake_TEST_EXPLICIT_MAKE_PROGRAM}
        )
    ENDIF ()

    IF (_isMultiConfig)
        SET(test_options -C Debug)
    ENDIF ()

    # Look for git to use for tests.
    FIND_PROGRAM(GIT_EXECUTABLE NAMES git)

    # Look for rpmbuild to use for tests.
    # The tool does not work with spaces in the path.
    IF (NOT CMAKE_CURRENT_BINARY_DIR MATCHES " ")
        FIND_PROGRAM(RPMBUILD_EXECUTABLE NAMES rpmbuild)
    ELSE ()
        SET(RPMBUILD_EXECUTABLE "RPMBUILD_EXECUTABLE-NOTFOUND")
    ENDIF ()

    IF (RPMBUILD_EXECUTABLE)
        SET(CPACK_BINARY_RPM ON)
    ELSE ()
        SET(CPACK_BINARY_RPM OFF)
    ENDIF ()

    # Look for dpkg to use for tests.
    FIND_PROGRAM(DPKG_EXECUTABLE NAMES dpkg)

    IF (DPKG_EXECUTABLE)
        SET(CPACK_BINARY_DEB ON)
    ELSE ()
        SET(CPACK_BINARY_DEB OFF)
    ENDIF ()

    IF (CMake_TEST_CPACK_NUGET)
        SET(CPACK_BINARY_NUGET ON)
    ELSE ()
        SET(CPACK_BINARY_NUGET OFF)
    ENDIF ()

    IF (WIN32)
        SET(reg_vs14 "[HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\VisualStudio\\14.0;InstallDir]")
        SET(reg_ws10_0 "[HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\Setup\\Build Tools for Windows 10;srcPath]")
        SET(reg_tegra "[HKEY_LOCAL_MACHINE\\SOFTWARE\\NVIDIA Corporation\\Nsight Tegra;sdkRoot]")
        SET(reg_nasm "[HKEY_CURRENT_USER\\SOFTWARE\\nasm]")
        FOREACH (reg IN ITEMS vs14 ws10_0 tegra nasm)
            GET_FILENAME_COMPONENT(r "${reg_${reg}}" ABSOLUTE)
            IF (IS_DIRECTORY "${r}" AND NOT "${r}" STREQUAL "/registry")
                SET(${reg} 1)
            ELSE ()
                SET(${reg} 0)
            ENDIF ()
        ENDFOREACH ()
        IF (CMAKE_HOST_WIN32 AND COMMAND cmake_host_system_information)
            SET(info_vs15 "VS_15_DIR")
            SET(info_vs16 "VS_16_DIR")
            SET(info_vs17 "VS_17_DIR")
            SET(info_vs18 "VS_18_DIR")
            SET(vs_versions)
            IF (WIN32)
                IF (NOT CMAKE_VERSION VERSION_LESS 4.2)
                    SET(vs_versions vs15 vs16 vs17 vs18)
                ELSEIF (NOT CMAKE_VERSION VERSION_LESS 3.21)
                    SET(vs_versions vs15 vs16 vs17)
                ELSEIF (NOT CMAKE_VERSION VERSION_LESS 3.14)
                    SET(vs_versions vs15 vs16)
                ELSEIF (NOT CMAKE_VERSION VERSION_LESS 3.8)
                    SET(vs_versions vs15)
                ENDIF ()
            ENDIF ()
            FOREACH (info IN LISTS vs_versions)
                CMAKE_HOST_SYSTEM_INFORMATION(RESULT found QUERY "${info_${info}}")
                IF (found)
                    SET(${info} 1)
                ELSE ()
                    SET(${info} 0)
                ENDIF ()
            ENDFOREACH ()
        ENDIF ()
    ENDIF ()

    IF (CMAKE_SYSTEM_NAME STREQUAL "Darwin" AND NOT DEFINED CMake_TEST_APPLE_SILICON)
        EXECUTE_PROCESS(COMMAND sysctl -q hw.optional.arm64
            OUTPUT_VARIABLE _sysctl_stdout
            ERROR_VARIABLE _sysctl_stderr
            RESULT_VARIABLE _sysctl_result
        )
        IF (_sysctl_result EQUAL 0 AND _sysctl_stdout MATCHES "hw.optional.arm64: 1")
            SET(CMake_TEST_APPLE_SILICON 1)
        ELSE ()
            SET(CMake_TEST_APPLE_SILICON 0)
        ENDIF ()
        UNSET(_sysctl_result)
        UNSET(_sysctl_stderr)
        UNSET(_sysctl_stdout)
    ENDIF ()

    #---------------------------------------------------------------------------
    # Add tests below here.

    IF (NOT DEFINED CMake_TEST_Qt6)
        SET(CMake_TEST_Qt6 1)
    ENDIF ()
    IF (CMake_TEST_Qt6)
        FIND_PACKAGE(Qt6 COMPONENTS Core Widgets QUIET NO_MODULE)
    ENDIF ()

    IF (NOT DEFINED CMake_TEST_Qt5)
        SET(CMake_TEST_Qt5 1)
    ENDIF ()
    IF (CMake_TEST_Qt5)
        FIND_PACKAGE(Qt5Widgets QUIET NO_MODULE)
    ENDIF ()

    # Collect a list of all test build directories.
    SET(TEST_BUILD_DIRS)

    # Should the long tests be run?
    OPTION(CMAKE_RUN_LONG_TESTS
        "Should the long tests be run (such as Bootstrap)." ON)
    MARK_AS_ADVANCED(CMAKE_RUN_LONG_TESTS)

    IF (CMAKE_RUN_LONG_TESTS)
        OPTION(CTEST_TEST_CTEST
            "Should the tests that run a full sub ctest process be run?"
            OFF)
        MARK_AS_ADVANCED(CTEST_TEST_CTEST)
    ENDIF ()

    OPTION(CTEST_TEST_CPACK
        "Should the tests that use '--build-target package' be run?"
        ON)
    MARK_AS_ADVANCED(CTEST_TEST_CPACK)
    SET(CMake_TEST_XCODE_VERSION 0)
    IF (APPLE)
        IF (XCODE_VERSION)
            SET(CMake_TEST_XCODE_VERSION "${XCODE_VERSION}")
        ELSE ()
            EXECUTE_PROCESS(
                COMMAND xcodebuild -version
                OUTPUT_VARIABLE _version
                ERROR_VARIABLE _stderr
                RESULT_VARIABLE _failed
            )
            IF (NOT _failed AND _version MATCHES "^Xcode ([0-9]+(\\.[0-9]+)*)")
                SET(CMake_TEST_XCODE_VERSION "${CMAKE_MATCH_1}")
            ENDIF ()
        ENDIF ()
        IF (CMAKE_OSX_SYSROOT)
            EXECUTE_PROCESS(
                COMMAND xcodebuild -sdk ${CMAKE_OSX_SYSROOT} -version ProductName
                OUTPUT_VARIABLE _stdout
                OUTPUT_STRIP_TRAILING_WHITESPACE
                ERROR_VARIABLE _stderr
                RESULT_VARIABLE _failed
            )
            IF (NOT _failed)
                SET(CMAKE_OSX_SDKPRODUCT "${_stdout}")
            ENDIF ()

            EXECUTE_PROCESS(
                COMMAND xcodebuild -sdk ${CMAKE_OSX_SYSROOT} -version SDKVersion
                OUTPUT_VARIABLE _stdout
                OUTPUT_STRIP_TRAILING_WHITESPACE
                ERROR_VARIABLE _stderr
                RESULT_VARIABLE _failed
            )
            IF (NOT _failed)
                SET(CMAKE_OSX_SDKVERSION "${_stdout}")
            ENDIF ()
        ENDIF ()
    ENDIF ()

    IF (CMake_TEST_XCODE_VERSION AND CMAKE_OSX_SDKVERSION AND CMAKE_OSX_SDKPRODUCT)
        IF ((NOT CMake_TEST_XCODE_VERSION VERSION_LESS 6.1) AND
            ((NOT CMAKE_OSX_SDKPRODUCT STREQUAL "Mac OS X") OR
      (NOT CMAKE_OSX_SDKVERSION VERSION_LESS 10.10))
        )
            IF (CMAKE_GENERATOR STREQUAL "Xcode")
                SET(CMake_TEST_XCODE_SWIFT 1)
            ENDIF ()
        ENDIF ()
    ENDIF ()
    IF (NOT DEFINED CMake_TEST_Swift)
        IF (CMAKE_Swift_COMPILER OR CMake_TEST_XCODE_SWIFT)
            SET(CMake_TEST_Swift 1)
        ENDIF ()
    ENDIF ()

    IF (NOT DEFINED CMake_TEST_OBJC)
        IF (APPLE AND CMAKE_C_COMPILER_ID MATCHES "Clang|GNU")
            SET(CMake_TEST_OBJC 1)
        ENDIF ()
    ENDIF ()

    IF (CMake_TEST_FindPython)
        SET(CMake_TEST_FindPython2 TRUE)
        SET(CMake_TEST_FindPython3 TRUE)
    ENDIF ()
    IF (CMake_TEST_FindPython_SABIModule)
        SET(CMake_TEST_FindPython2_SABIModule TRUE)
        SET(CMake_TEST_FindPython3_SABIModule TRUE)
    ENDIF ()
    IF (CMake_TEST_FindPython_NumPy)
        SET(CMake_TEST_FindPython2_NumPy TRUE)
        SET(CMake_TEST_FindPython3_NumPy TRUE)
    ENDIF ()
    IF (CMake_TEST_FindPython_Conda)
        SET(CMake_TEST_FindPython3_Conda TRUE)
    ENDIF ()
    IF (CMake_TEST_FindPython_IronPython)
        SET(CMake_TEST_FindPython2_IronPython TRUE)
        SET(CMake_TEST_FindPython3_IronPython TRUE)
    ENDIF ()
    IF (CMake_TEST_FindPython_PyPy)
        SET(CMake_TEST_FindPython2_PyPy TRUE)
        SET(CMake_TEST_FindPython3_PyPy TRUE)
    ENDIF ()
    IF (CMake_TEST_FindPython2 AND CMAKE_SYSTEM_NAME MATCHES "Linux|Darwin")
        SET(CMake_TEST_FindPython2_SABIModule TRUE)
    ENDIF ()
    IF (CMake_TEST_FindPython3 AND CMAKE_SYSTEM_NAME MATCHES "Linux|Darwin")
        SET(CMake_TEST_FindPython3_SABIModule TRUE)
    ENDIF ()

    # Use 1500 or CTEST_TEST_TIMEOUT for long test timeout value,
    # whichever is greater.
    SET(CMAKE_LONG_TEST_TIMEOUT 1500)
    IF (CTEST_TEST_TIMEOUT)
        SET(CMAKE_LONG_TEST_TIMEOUT ${CTEST_TEST_TIMEOUT})
    ENDIF ()
    IF (CMAKE_LONG_TEST_TIMEOUT LESS 1500)
        SET(CMAKE_LONG_TEST_TIMEOUT 1500)
    ENDIF ()

    IF (NOT CMake_TEST_EXTERNAL_CMAKE)
        ADD_SUBDIRECTORY(CMakeLib)
    ENDIF ()
    ADD_SUBDIRECTORY(CMakeOnly)
    ADD_SUBDIRECTORY(RunCMake)

    ADD_SUBDIRECTORY(FindPackageModeMakefileTest)

    ADD_TEST(NAME CMake.Copyright
        COMMAND ${CMAKE_CMAKE_COMMAND} -P ${CMAKE_CURRENT_SOURCE_DIR}/CMakeCopyright.cmake)

    # add a bunch of standard build-and-test style tests
    ADD_TEST_MACRO(CommandLineTest CommandLineTest)
    ADD_TEST_MACRO(FindPackageCMakeTest FindPackageCMakeTest)
    ADD_TEST_MACRO(FindPackageCpsTest FindPackageCpsTest)
    ADD_TEST_MACRO(StringFileTest StringFileTest)
    ADD_TEST_MACRO(TryCompile TryCompile)
    ADD_TEST_MACRO(SystemInformation SystemInformation)
    ADD_TEST_MACRO(MathTest MathTest)

    STRING(REPLACE ";" "$<SEMICOLON>" TEST_STDS_C "${CMake_TEST_C_STANDARDS}")
    STRING(REPLACE ";" "$<SEMICOLON>" TEST_STDS_CXX "${CMake_TEST_CXX_STANDARDS}")
    STRING(REPLACE ";" "$<SEMICOLON>" TEST_STDS_CUDA "${CMake_TEST_CUDA_STANDARDS}")
    STRING(REPLACE ";" "$<SEMICOLON>" TEST_STDS_HIP "${CMake_TEST_HIP_STANDARDS}")
    SET(CompileFeatures_BUILD_OPTIONS
        -DCMake_TEST_C_STANDARDS=${TEST_STDS_C}
        -DCMake_TEST_CXX_STANDARDS=${TEST_STDS_CXX}
        -DCMake_TEST_CUDA=${CMake_TEST_CUDA}
        -DCMake_TEST_CUDA_STANDARDS=${TEST_STDS_CUDA}
        -DCMake_TEST_HIP=${CMake_TEST_HIP}
        -DCMake_TEST_HIP_STANDARDS=${TEST_STDS_HIP}
    )
    ADD_TEST_MACRO(CompileFeatures CompileFeatures)
    SET_PROPERTY(TEST CompileFeatures APPEND PROPERTY LABELS "CUDA" "HIP")

    ADD_TEST_MACRO(CMakeCommands.target_compile_features)

    IF (CMake_TEST_RESOURCES)
        ADD_TEST_MACRO(VSResource VSResource)
        IF (CMAKE_GENERATOR MATCHES "Ninja")
            ADD_TEST_MACRO(VSResourceNinjaForceRSP VSResourceNinjaForceRSP)
        ENDIF ()
    ENDIF ()
    IF (_isMultiConfig)
        SET(MSManifest_CTEST_OPTIONS -C $<CONFIGURATION>)
    ENDIF ()
    ADD_TEST_MACRO(MSManifest ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
    ADD_TEST_MACRO(Simple Simple)
    ADD_TEST_MACRO(PreOrder PreOrder)
    ADD_TEST_MACRO(MissingSourceFile MissingSourceFile)
    SET_TESTS_PROPERTIES(MissingSourceFile PROPERTIES
        PASS_REGULAR_EXPRESSION "CMake Error at CMakeLists\.txt:3 \\(add_executable\\):[ \r\n]*Cannot find source file:[ \r\n]*DoesNotExist/MissingSourceFile.c")
    IF (CMake_TEST_Swift)
        ADD_TEST_MACRO(SwiftOnly SwiftOnly)
        ADD_TEST_MACRO(SwiftMixPCH SwiftMixPCH)
        IF (CMake_TEST_XCODE_SWIFT)
            ADD_TEST_MACRO(SwiftMix SwiftMix)
        ENDIF ()
        IF (CMAKE_Swift_COMPILER_VERSION VERSION_GREATER_EQUAL 5.1)
            ADD_TEST_MACRO(SwiftMixLib Swifty)
        ENDIF ()
    ENDIF ()
    IF (CMAKE_Fortran_COMPILER)
        ADD_TEST_MACRO(FortranOnly FortranOnly)
        SET_PROPERTY(TEST FortranOnly APPEND PROPERTY LABELS "Fortran")
    ENDIF ()
    # test Visual Studio GNU Fortran mixing with cmake_add_fortran_subdirectory
    # run this project if we have a working fortran compiler or
    # the test is enabled with CMAKE_TEST_CMAKE_ADD_FORTRAN cache variable.
    # If you enable the test, CMake should find the MinGW fortran install,
    # or in some cases you might need to set the PATH so that cmake can find
    # the gfortran from mingw.
    IF (CMAKE_Fortran_COMPILER OR CMAKE_TEST_CMAKE_ADD_FORTRAN)
        SET(CMAKE_SKIP_VSGNUFortran FALSE)
        # disable test for apple builds using ifort if they are building
        # more than one architecture, as ifort does not support that.
        IF (APPLE AND (CMAKE_Fortran_COMPILER MATCHES ifort))
            LIST(LENGTH CMAKE_OSX_ARCHITECTURES len)
            IF ("${len}" GREATER 1)
                MESSAGE(STATUS "Skip VSGNUFortran for ifort dual cpu mac build")
                SET(CMAKE_SKIP_VSGNUFortran TRUE)
            ENDIF ()
        ENDIF ()
        IF (CMAKE_Fortran_COMPILER_ID STREQUAL LLVMFlang)
            # No DLLEXPORT for 'Tests/VSGNUFortran/subdir/fortran/world.f'.
            SET(CMAKE_SKIP_VSGNUFortran TRUE)
        ENDIF ()
        IF (CMAKE_Fortran_COMPILER_ID STREQUAL IntelLLVM)
            MESSAGE(STATUS "Skip VSGNUFortran for ifx until DLLEXPORT support is implemented")
            SET(CMAKE_SKIP_VSGNUFortran TRUE)
        ENDIF ()
        IF ((CMAKE_C_COMPILER MATCHES lsb)
            AND (CMAKE_Fortran_COMPILER MATCHES ifort))
            MESSAGE(STATUS "Skip VSGNUFortran for ifort and lsb compilers")
            SET(CMAKE_SKIP_VSGNUFortran TRUE)
        ENDIF ()
        IF (NOT CMAKE_SKIP_VSGNUFortran)
            ADD_TEST_MACRO(VSGNUFortran ${CMAKE_CMAKE_COMMAND} -P runtest.cmake)
            SET_PROPERTY(TEST VSGNUFortran APPEND PROPERTY LABELS "Fortran")
        ENDIF ()
    ENDIF ()

    IF (CMake_TEST_OBJC)
        ADD_SUBDIRECTORY(ObjC)
        ADD_SUBDIRECTORY(ObjCXX)
    ENDIF ()

    IF (${CMAKE_GENERATOR} MATCHES "Visual Studio")
        ADD_TEST_MACRO(CSharpOnly CSharpOnly)
        IF (NOT CMAKE_VS_PLATFORM_NAME STREQUAL "ARM64")
            ADD_TEST_MACRO(CSharpLinkToCxx CSharpLinkToCxx)
            ADD_TEST_MACRO(CSharpLinkFromCxx CSharpLinkFromCxx)
        ENDIF ()
        ADD_TEST_MACRO(CSharpWin32GenEx CSharpWin32GenEx)
        SET_TESTS_PROPERTIES(CSharpWin32GenEx PROPERTIES
            PASS_REGULAR_EXPRESSION "Target \"CSharpWin32GenEx\" has a generator expression in its\n  WIN32_EXECUTABLE property\\.  This is not supported on managed executables\\."
        )
    ENDIF ()

    ADD_TEST_MACRO(COnly COnly)
    ADD_TEST_MACRO(CxxOnly CxxOnly)
    ADD_TEST_MACRO(CxxSubdirC CxxSubdirC)
    ADD_TEST_MACRO(OutDir runtime/OutDir)
    ADD_TEST_MACRO(OutName exe.OutName.exe)
    ADD_TEST_MACRO(ObjectLibrary UseCshared)
    ADD_TEST_MACRO(SharedLibraryArchive UseSLA)
    ADD_TEST_MACRO(NewlineArgs NewlineArgs)
    ADD_TEST_MACRO(SetLang SetLangX)
    ADD_TEST_MACRO(EmptyProperty EmptyProperty)
    ADD_TEST_MACRO(ExternalOBJ ExternalOBJ)
    ADD_TEST_MACRO(LinkDirectory bin/LinkDirectory)
    ADD_TEST_MACRO(LinkLanguage LinkLanguage)
    ADD_TEST_MACRO(LinkLine LinkLine)
    ADD_TEST_MACRO(MacroTest miniMacroTest)
    ADD_TEST_MACRO(FunctionTest miniFunctionTest)
    ADD_TEST_MACRO(ReturnTest ReturnTest)
    ADD_TEST_MACRO(Properties Properties)
    ADD_TEST_MACRO(Assembler HelloAsm)
    # relies on Linux syscall interface
    IF (CMake_TEST_ASM_NASM AND CMAKE_SYSTEM_NAME MATCHES "Linux" AND CMAKE_SYSTEM_PROCESSOR STREQUAL "x86_64")
        ADD_TEST_MACRO(NasmOnly NasmOnly)
    ENDIF ()
    ADD_TEST_MACRO(SourceGroups SourceGroups)
    ADD_TEST_MACRO(Preprocess Preprocess)
    SET(ExportImport_BUILD_OPTIONS -DCMake_TEST_NESTED_MAKE_PROGRAM:FILEPATH=${CMake_TEST_EXPLICIT_MAKE_PROGRAM}
        -DCMake_TEST_CUDA:BOOL=${CMake_TEST_CUDA}
        -DCMake_INSTALL_NAME_TOOL_BUG:BOOL=${CMake_INSTALL_NAME_TOOL_BUG}
    )
    ADD_TEST_MACRO(ExportImport ExportImport)
    SET_PROPERTY(TEST ExportImport APPEND
        PROPERTY LABELS "CUDA")
    ADD_TEST_MACRO(Unset Unset)
    ADD_TEST_MACRO(PolicyScope PolicyScope)
    ADD_TEST_MACRO(EmptyLibrary EmptyLibrary)
    ADD_TEST_MACRO(CompileDefinitions CompileDefinitions)

    IF (_isMultiConfig)
        SET(CompileOptions_CTEST_OPTIONS --build-config $<CONFIGURATION>)
    ELSE ()
        SET(CompileOptions_BUILD_OPTIONS -DCMAKE_BUILD_TYPE=$<CONFIGURATION>)
    ENDIF ()
    IF (CMAKE_Fortran_COMPILER)
        LIST(APPEND CompileOptions_BUILD_OPTIONS -DTEST_FORTRAN=1)
    ENDIF ()
    ADD_TEST_MACRO(CompileOptions CompileOptions)
    SET_PROPERTY(TEST CompileOptions APPEND PROPERTY LABELS "Fortran")

    ADD_TEST_MACRO(CompatibleInterface CompatibleInterface)
    ADD_TEST_MACRO(CustomTransitiveProperties CustomTransitiveProperties)
    ADD_TEST_MACRO(AliasTarget AliasTarget)
    ADD_TEST_MACRO(StagingPrefix StagingPrefix)
    ADD_TEST_MACRO(ImportedSameName ImportedSameName)
    ADD_TEST_MACRO(InterfaceLibrary InterfaceLibrary)
    IF (NOT CMAKE_GENERATOR STREQUAL "Xcode")
        IF (_isMultiConfig)
            SET(ConfigSources_CTEST_OPTIONS --build-config $<CONFIGURATION>)
        ELSE ()
            SET(ConfigSources_BUILD_OPTIONS -DCMAKE_BUILD_TYPE=$<CONFIGURATION>)
        ENDIF ()
        ADD_TEST_MACRO(ConfigSources ConfigSources)
    ENDIF ()
    ADD_TEST_MACRO(SourcesProperty SourcesProperty)
    ADD_TEST_MACRO(SourceFileProperty SourceFileProperty)
    IF (NOT CMAKE_GENERATOR STREQUAL "Xcode")
        ADD_TEST_MACRO(SourceFileIncludeDirProperty SourceFileIncludeDirProperty)
    ENDIF ()
    IF (CMAKE_CXX_COMPILER_ID STREQUAL "LCC" OR (CMAKE_CXX_COMPILER_ID STREQUAL "GNU"
      AND NOT CMAKE_CXX_COMPILER_VERSION VERSION_LESS 4.7)
    )
        SET(runCxxDialectTest 1)
    ENDIF ()
    IF (CMAKE_CXX_COMPILER_ID STREQUAL Clang
        AND NOT CMAKE_CXX_COMPILER_VERSION VERSION_LESS 3.4 AND NOT "x${CMAKE_CXX_SIMULATE_ID}" STREQUAL "xMSVC")
        IF (NOT APPLE OR POLICY CMP0025)
            SET(runCxxDialectTest 1)
        ENDIF ()
    ENDIF ()
    IF (runCxxDialectTest)
        ADD_TEST_MACRO(CxxDialect CxxDialect)
    ENDIF ()
    SET_TESTS_PROPERTIES(EmptyLibrary PROPERTIES
        PASS_REGULAR_EXPRESSION "CMake Error: CMake can not determine linker language for target: test")
    ADD_TEST_MACRO(CrossCompile CrossCompile)
    SET_TESTS_PROPERTIES(CrossCompile PROPERTIES
        PASS_REGULAR_EXPRESSION "try_run.. invoked in cross-compiling mode")
    IF (CMake_TEST_XCODE_VERSION)
        SET(Architecture_BUILD_OPTIONS -DCMake_TEST_XCODE_VERSION=${CMake_TEST_XCODE_VERSION})
        ADD_TEST_MACRO(Architecture Architecture)
        SET_TESTS_PROPERTIES(Architecture PROPERTIES
            PASS_REGULAR_EXPRESSION "(file is not of required architecture|does not match cputype|not the architecture being linked|but attempting to link with file built for)")
        SET_PROPERTY(TEST Architecture APPEND PROPERTY
            PASS_REGULAR_EXPRESSION "Skip test x86_64 only|found architecture '.*', required architecture '.*'")
    ENDIF ()

    LIST(APPEND TEST_BUILD_DIRS ${CMake_TEST_INSTALL_PREFIX})

    IF (NOT DEFINED CMake_TEST_Qt4)
        SET(CMake_TEST_Qt4 1)
    ENDIF ()
    IF (CMake_TEST_Qt4 AND NOT Qt4_FOUND)
        FIND_PACKAGE(Qt4 QUIET)
    ENDIF ()

    IF (CMake_TEST_Qt4 AND Qt4_FOUND)
        # test whether the Qt4 which has been found works, on some machines
        # which run nightly builds there were errors like "wrong file format"
        # for libQtCore.so. So first check it works, and only if it does add
        # the automoc test.
        INCLUDE(CheckCXXSourceCompiles)
        SET(_save_CMAKE_REQUIRED_INCLUDES "${CMAKE_REQUIRED_INCLUDES}")
        SET(_save_CMAKE_REQUIRED_LIBRARIES "${CMAKE_REQUIRED_LIBRARIES}")

        SET(CMAKE_REQUIRED_INCLUDES ${QT_INCLUDES})
        SET(CMAKE_REQUIRED_LIBRARIES ${QT_QTCORE_LIBRARIES})

        CHECK_CXX_SOURCE_COMPILES("#include <QCoreApplication>\n int main() {return (qApp == 0 ? 0 : 1); }\n"
            QT4_WORKS)

        SET(CMAKE_REQUIRED_INCLUDES "${_save_CMAKE_REQUIRED_INCLUDES}")
        SET(CMAKE_REQUIRED_LIBRARIES "${_save_CMAKE_REQUIRED_LIBRARIES}")
    ENDIF ()

    # run test for BundleUtilities on supported platforms/compilers
    IF ((MSVC OR
      MINGW OR
      CMAKE_SYSTEM_NAME MATCHES "Linux" OR
      CMAKE_SYSTEM_NAME MATCHES "Darwin")
        AND NOT CMAKE_GENERATOR STREQUAL "Watcom WMake")

        ADD_TEST(BundleUtilities ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/BundleUtilities"
            "${CMake_BINARY_DIR}/Tests/BundleUtilities"
            ${build_generator_args}
            --build-project BundleUtilities
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/BundleUtilities")

        # run test for DeployQt4 on supported platforms/compilers (which depends on BundleUtilities)
        # this test also depends on the existence of the standard qtiff plugin
        IF (QT4_WORKS AND QT_QTSQL_FOUND)
            ADD_TEST(Qt4Deploy ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/Qt4Deploy"
                "${CMake_BINARY_DIR}/Tests/Qt4Deploy"
                ${build_generator_args}
                --build-project Qt4Deploy
                --build-options
                -DCMAKE_BUILD_TYPE:STRING=${CMAKE_BUILD_TYPE}
                -DQT_QMAKE_EXECUTABLE:FILEPATH=${QT_QMAKE_EXECUTABLE}
            )
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Qt4Deploy")
        ENDIF ()

    ENDIF ()

    SET(CMAKE_BUILD_TEST_SOURCE_DIR "${CMake_SOURCE_DIR}/Tests/COnly")
    SET(CMAKE_BUILD_TEST_BINARY_DIR "${CMake_BINARY_DIR}/Tests/CMakeBuildCOnly")
    SET(CMAKE_BUILD_TEST_EXE COnly)
    CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CMakeBuildTest.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CMakeBuildTest.cmake" @ONLY)
    ADD_TEST(CMakeBuildTest ${CMAKE_CMAKE_COMMAND} -P
        "${CMake_BINARY_DIR}/Tests/CMakeBuildTest.cmake")
    LIST(APPEND TEST_BUILD_DIRS ${CMAKE_BUILD_TEST_BINARY_DIR})
    # now do it again for a project that has two project commands
    SET(CMAKE_BUILD_TEST_SOURCE_DIR "${CMake_SOURCE_DIR}/Tests/DoubleProject")
    SET(CMAKE_BUILD_TEST_BINARY_DIR "${CMake_BINARY_DIR}/Tests/DoubleProject")
    SET(CMAKE_BUILD_TEST_EXE just_silly)
    CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CMakeBuildTest.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CMakeBuildDoubleProjectTest.cmake" @ONLY)
    ADD_TEST(CMakeDoubleProject ${CMAKE_CMAKE_COMMAND} -P
        "${CMake_BINARY_DIR}/Tests/CMakeBuildDoubleProjectTest.cmake")
    LIST(APPEND TEST_BUILD_DIRS ${CMAKE_BUILD_TEST_BINARY_DIR})

    SET(Module.CheckIPOSupported-C_BUILD_OPTIONS -DCMake_TEST_IPO_WORKS_C=${CMake_TEST_IPO_WORKS_C})
    ADD_TEST_MACRO(Module.CheckIPOSupported-C CheckIPOSupported-C)

    SET(Module.CheckIPOSupported-CXX_BUILD_OPTIONS -DCMake_TEST_IPO_WORKS_CXX=${CMake_TEST_IPO_WORKS_CXX})
    ADD_TEST_MACRO(Module.CheckIPOSupported-CXX CheckIPOSupported-CXX)

    IF (CMake_TEST_CUDA)
        ADD_TEST_MACRO(Module.CheckIPOSupported-CUDA CheckIPOSupported-CUDA)
        SET_PROPERTY(TEST Module.CheckIPOSupported-CUDA APPEND PROPERTY LABELS "CUDA")
    ENDIF ()

    IF (CMAKE_Fortran_COMPILER)
        SET(Module.CheckIPOSupported-Fortran_BUILD_OPTIONS -DCMake_TEST_IPO_WORKS_Fortran=${CMake_TEST_IPO_WORKS_Fortran})
        ADD_TEST_MACRO(Module.CheckIPOSupported-Fortran CheckIPOSupported-Fortran)
        SET_PROPERTY(TEST Module.CheckIPOSupported-Fortran APPEND PROPERTY LABELS "Fortran")
    ENDIF ()

    ADD_TEST(Module.ExternalData ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Module/ExternalData"
        "${CMake_BINARY_DIR}/Tests/Module/ExternalData"
        ${build_generator_args}
        --build-project ExternalDataTest
        --build-noclean
        --build-options
        -DMAKE_SUPPORTS_SPACES=${MAKE_SUPPORTS_SPACES}
        --test-command ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE} -V
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Module/ExternalData")

    ADD_TEST_MACRO(Module.FindDependency FindDependency)

    ADD_TEST_MACRO(Module.WriteCompilerDetectionHeader WriteCompilerDetectionHeader)

    IF (APPLE OR CMAKE_CXX_COMPILER_ID MATCHES "GNU" OR CMAKE_CXX_COMPILER_ID MATCHES "LCC")
        INCLUDE(CheckCXXCompilerFlag)
        CHECK_CXX_COMPILER_FLAG(-fPIE run_pic_test)
    ELSE ()
        IF (CMAKE_CXX_COMPILER_ID MATCHES "PGI"
            OR CMAKE_CXX_COMPILER_ID MATCHES "PathScale"
            OR CMAKE_CXX_COMPILER_ID MATCHES "Intel")
            SET(run_pic_test 0)
        ELSE ()
            SET(run_pic_test 1)
        ENDIF ()
    ENDIF ()

    IF (run_pic_test)
        ADD_TEST_MACRO(PositionIndependentTargets PositionIndependentTargets)
    ENDIF ()

    IF (CMAKE_CXX_COMPILER_ID MATCHES "LCC" OR
        ((CMAKE_CXX_COMPILER_ID MATCHES "GNU") AND
    (NOT "${CMAKE_CXX_COMPILER_VERSION}" VERSION_LESS 4.2) AND
    (CMAKE_SYSTEM_NAME MATCHES "Linux"))
    )

        INCLUDE(CheckCXXCompilerFlag)
        CHECK_CXX_COMPILER_FLAG(
            -fvisibility-inlines-hidden run_inlines_hidden_test)
    ENDIF ()

    IF (run_inlines_hidden_test)
        ADD_TEST(Visibility ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/Visibility"
            "${CMake_BINARY_DIR}/Tests/Visibility"
            ${build_generator_args}
            --build-project Visibility
        )
        LIST(APPEND TEST_BUILD_DIRS
            "${CMake_BINARY_DIR}/Tests/Visibility"
        )
    ENDIF ()

    ADD_TEST(LinkFlags-prepare
        ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/LinkFlags"
        "${CMake_BINARY_DIR}/Tests/LinkFlags"
        ${build_generator_args}
        --build-project LinkFlags
        --build-target LinkFlags
        --build-options
        -DTEST_CONFIG=\${CTEST_CONFIGURATION_TYPE}
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/LinkFlags")

    MACRO(ADD_LINK_FLAGS_TEST name depends)
        ADD_TEST(LinkFlags-${name}
            ${CMAKE_CMAKE_COMMAND} --build "${CMake_BINARY_DIR}/Tests/LinkFlags"
            --target LinkFlags_${name} --config ${CTEST_CONFIGURATION_TYPE}
        )
        SET_TESTS_PROPERTIES(LinkFlags-${name} PROPERTIES
            PASS_REGULAR_EXPRESSION "BADFLAG" DEPENDS LinkFlags-${depends})
    ENDMACRO()
    ADD_LINK_FLAGS_TEST(lib prepare)
    ADD_LINK_FLAGS_TEST(dll lib)
    ADD_LINK_FLAGS_TEST(mod dll)
    ADD_LINK_FLAGS_TEST(exe mod)
    ADD_LINK_FLAGS_TEST(lib_config exe)
    ADD_LINK_FLAGS_TEST(dll_config lib_config)
    ADD_LINK_FLAGS_TEST(mod_config dll_config)
    ADD_LINK_FLAGS_TEST(exe_config mod_config)
    ADD_LINK_FLAGS_TEST(lib_flags exe_config)
    ADD_LINK_FLAGS_TEST(dll_flags lib_flags)
    ADD_LINK_FLAGS_TEST(mod_flags dll_flags)
    ADD_LINK_FLAGS_TEST(exe_flags mod_flags)
    ADD_LINK_FLAGS_TEST(lib_flags_config exe_flags)
    ADD_LINK_FLAGS_TEST(dll_flags_config lib_flags_config)
    ADD_LINK_FLAGS_TEST(mod_flags_config dll_flags_config)
    ADD_LINK_FLAGS_TEST(exe_flags_config mod_flags_config)

    # test for correct sub-project generation
    # not implemented in Xcode or Ninja
    IF (NOT CMAKE_GENERATOR MATCHES "Xcode|Ninja|FASTBuild")
        # run cmake and configure all of SubProject
        # but only build the independent executable car
        ADD_TEST(SubProject ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/SubProject"
            "${CMake_BINARY_DIR}/Tests/SubProject"
            --build-project SubProject
            ${build_generator_args}
            --build-target car
            --test-command car
        )

        # For stage 2, do not run cmake again.
        # Then build the foo sub project which should build
        # the bar library which should be referenced because
        # foo links to the static library bar, but bar is not
        # directly in the foo sub project
        IF (CMake_TEST_EXPLICIT_MAKE_PROGRAM)
            SET(SubProject-Stage2_BUILD_MAKEPROGRAM
                --build-makeprogram ${CMake_TEST_EXPLICIT_MAKE_PROGRAM}
            )
        ENDIF ()
        ADD_TEST(SubProject-Stage2 ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/SubProject/foo"
            "${CMake_BINARY_DIR}/Tests/SubProject/foo"
            --build-generator ${CMAKE_GENERATOR}
            --build-generator-platform "${CMAKE_GENERATOR_PLATFORM}"
            --build-generator-toolset "${CMAKE_GENERATOR_TOOLSET}"
            ${SubProject-Stage2_BUILD_MAKEPROGRAM}
            --build-nocmake
            --build-project foo
            --build-target foo
            --build-exe-dir "${CMake_BINARY_DIR}/Tests/SubProject/foo"
            --test-command foo
        )
        SET_TESTS_PROPERTIES(SubProject-Stage2 PROPERTIES DEPENDS SubProject)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/SubProject")
    ENDIF ()

    # add tests with more complex invocations
    ADD_TEST(Framework ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Framework"
        "${CMake_BINARY_DIR}/Tests/Framework"
        --build-two-config
        ${build_generator_args}
        --build-project Framework
        --build-options
        -DMAKE_SUPPORTS_SPACES=${MAKE_SUPPORTS_SPACES}
        "-DCMAKE_INSTALL_PREFIX:PATH=${CMake_BINARY_DIR}/Tests/Framework/Install"
        --test-command bar)
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Framework")

    ADD_TEST(TargetName ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/TargetName"
        "${CMake_BINARY_DIR}/Tests/TargetName"
        --build-two-config
        ${build_generator_args}
        --build-project TargetName
        --test-command ${CMAKE_CMAKE_COMMAND} -E compare_files
        ${CMake_SOURCE_DIR}/Tests/TargetName/scripts/hello_world
        ${CMake_BINARY_DIR}/Tests/TargetName/scripts/hello_world)
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/TargetName")

    ADD_TEST(LibName ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/LibName"
        "${CMake_BINARY_DIR}/Tests/LibName"
        --build-two-config
        ${build_generator_args}
        --build-project LibName
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/LibName/lib"
        --build-options
        -DMAKE_SUPPORTS_SPACES=${MAKE_SUPPORTS_SPACES}
        --test-command foobar
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/LibName")

    ADD_TEST(CustComDepend ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/CustComDepend"
        "${CMake_BINARY_DIR}/Tests/CustComDepend"
        --build-two-config
        ${build_generator_args}
        --build-project CustComDepend
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/CustComDepend/bin"
        --test-command foo bar.c
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CustComDepend")

    ADD_TEST(ArgumentExpansion ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ArgumentExpansion"
        "${CMake_BINARY_DIR}/Tests/ArgumentExpansion"
        ${build_generator_args}
        --build-project ArgumentExpansion
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/ArgumentExpansion/bin"
    )
    SET_TESTS_PROPERTIES(ArgumentExpansion PROPERTIES
        FAIL_REGULAR_EXPRESSION "Unexpected: ")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ArgumentExpansion")

    ADD_TEST(GeneratorExpression
        ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/GeneratorExpression"
        "${CMake_BINARY_DIR}/Tests/GeneratorExpression"
        ${build_generator_args}
        --build-project GeneratorExpression
        --build-options
        -DCMAKE_BUILD_TYPE=\${CTEST_CONFIGURATION_TYPE}
        --test-command ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE} -V
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/GeneratorExpression")

    ADD_TEST(CustomCommand ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/CustomCommand"
        "${CMake_BINARY_DIR}/Tests/CustomCommand"
        --build-two-config
        ${build_generator_args}
        --build-project CustomCommand
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/CustomCommand/bin"
        --build-options
        --test-command CustomCommand
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CustomCommand")

    ADD_TEST_MACRO(CustomCommandByproducts CustomCommandByproducts)

    ADD_TEST_MACRO(CommandLength CommandLength)

    ADD_TEST_MACRO(EmptyDepends ${CMAKE_CTEST_COMMAND})

    ADD_TEST(CustomCommandWorkingDirectory ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/CustomCommandWorkingDirectory"
        "${CMake_BINARY_DIR}/Tests/CustomCommandWorkingDirectory"
        --build-two-config
        ${build_generator_args}
        --build-project TestWorkingDir
        --test-command working
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CustomCommandWorkingDirectory")

    ADD_TEST(OutOfSource ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/OutOfSource"
        "${CMake_BINARY_DIR}/Tests/OutOfSource"
        ${build_generator_args}
        --build-project OutOfSource
        --build-two-config
        --test-command
        "${CMake_BINARY_DIR}/Tests/OutOfSource/SubDir/OutOfSourceSubdir/simple")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/OutOfSource")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/OutOfSourceDeep")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/OutOfBinary")

    ADD_TEST(BuildDepends ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/BuildDepends"
        "${CMake_BINARY_DIR}/Tests/BuildDepends"
        ${build_generator_args}
        --build-project BuildDepends
        --build-options
        "-DCMake_TEST_XCODE_VERSION=${CMake_TEST_XCODE_VERSION}"
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/BuildDepends")

    SET(MissingInstallInstallDir
        "${CMake_BINARY_DIR}/Tests/MissingInstall/InstallDirectory")
    ADD_TEST(MissingInstall ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/MissingInstall"
        "${CMake_BINARY_DIR}/Tests/MissingInstall"
        ${build_generator_args}
        --build-project TestMissingInstall
        --build-two-config
        --build-options
        "-DCMAKE_INSTALL_PREFIX:PATH=${MissingInstallInstallDir}")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/MissingInstall")

    # By default, run the CPackComponents test if the CTEST_TEST_CPACK
    # option is ON:
    #
    SET(CTEST_RUN_CPackComponents ${CTEST_TEST_CPACK})
    SET(CTEST_package_X11_TEST ${CTEST_TEST_CPACK})
    SET(CTEST_RUN_CPackComponentsForAll ${CTEST_TEST_CPACK})
    SET(CTEST_RUN_CPackComponentsPrefix ${CTEST_TEST_CPACK})

    FIND_PROGRAM(NSIS_MAKENSIS_EXECUTABLE NAMES makensis
        PATHS [HKEY_LOCAL_MACHINE\\SOFTWARE\\NSIS]
        DOC "makensis program location"
    )

    # But on Windows, only run the CPackComponents test if the NSIS
    # installer builder is available:
    #
    IF (WIN32)
        IF (NSIS_MAKENSIS_EXECUTABLE)
            SET(CTEST_RUN_CPackComponents ON)
        ELSE ()
            SET(CTEST_RUN_CPackComponents OFF)
            SET(CTEST_package_X11_TEST OFF)
        ENDIF ()
    ENDIF ()

    # On Windows run the CPackInnoSetupGenerator test
    IF (WIN32 AND CMake_TEST_CPACK_INNOSETUP)
        ADD_TEST(CPackInnoSetupGenerator ${CMAKE_CTEST_COMMAND}
            -C ${CTEST_CONFIGURATION_TYPE}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackInnoSetupGenerator"
            "${CMake_BINARY_DIR}/Tests/CPackInnoSetupGenerator"
            ${build_generator_args}
            --build-project CPackInnoSetupGenerator
            --build-options
            --test-command ${CMAKE_CMAKE_COMMAND}
            "-DCPackInnoSetupGenerator_BINARY_DIR:PATH=${CMake_BINARY_DIR}/Tests/CPackInnoSetupGenerator"
            "-Dconfig=\${CTEST_CONFIGURATION_TYPE}"
            -P "${CMake_SOURCE_DIR}/Tests/CPackInnoSetupGenerator/RunCPackVerifyResult.cmake")

        SET_PROPERTY(TEST CPackInnoSetupGenerator PROPERTY
            ATTACHED_FILES_ON_FAIL
            "${CMake_BINARY_DIR}/Tests/CPackInnoSetupGenerator/_CPack_Packages/win32/INNOSETUP/ISCCOutput.log")

        SET_PROPERTY(TEST CPackInnoSetupGenerator PROPERTY
            ATTACHED_FILES
            "${CMake_BINARY_DIR}/Tests/CPackInnoSetupGenerator/_CPack_Packages/win32/INNOSETUP/ISScript.iss")
    ENDIF ()

    # On Windows run the CPackNSISGenerator test
    # if the nsis is available
    IF (WIN32 AND NSIS_MAKENSIS_EXECUTABLE)
        ADD_TEST(CPackNSISGenerator ${CMAKE_CTEST_COMMAND}
            -C ${CTEST_CONFIGURATION_TYPE}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackNSISGenerator"
            "${CMake_BINARY_DIR}/Tests/CPackNSISGenerator"
            ${build_generator_args}
            --build-project CPackNSISGenerator
            --build-options
            --test-command ${CMAKE_CMAKE_COMMAND}
            "-DCPackNSISGenerator_BINARY_DIR:PATH=${CMake_BINARY_DIR}/Tests/CPackNSISGenerator"
            "-Dconfig=\${CTEST_CONFIGURATION_TYPE}"
            -P "${CMake_SOURCE_DIR}/Tests/CPackNSISGenerator/RunCPackVerifyResult.cmake")

        SET_PROPERTY(TEST CPackNSISGenerator PROPERTY
            ATTACHED_FILES_ON_FAIL
            "${CMake_BINARY_DIR}/Tests/CPackNSISGenerator/_CPack_Packages/win32/NSIS/NSISOutput.log")
    ENDIF ()

    FIND_PROGRAM(IFW_BINARYCREATOR_EXECUTABLE NAMES binarycreator
        DOC "IFW binarycreator program location"
    )

    IF (IFW_BINARYCREATOR_EXECUTABLE)
        ADD_TEST(CPackIFWGenerator ${CMAKE_CTEST_COMMAND}
            -C ${CTEST_CONFIGURATION_TYPE}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackIFWGenerator"
            "${CMake_BINARY_DIR}/Tests/CPackIFWGenerator"
            ${build_generator_args}
            --build-project CPackIFWGenerator
            --build-options
            --test-command ${CMAKE_CMAKE_COMMAND}
            "-DCPackIFWGenerator_BINARY_DIR:PATH=${CMake_BINARY_DIR}/Tests/CPackIFWGenerator"
            "-Dconfig=\${CTEST_CONFIGURATION_TYPE}"
            -P "${CMake_SOURCE_DIR}/Tests/CPackIFWGenerator/RunCPackVerifyResult.cmake")

        SET_PROPERTY(TEST CPackIFWGenerator PROPERTY
            ATTACHED_FILES_ON_FAIL
            "${CMake_BINARY_DIR}/Tests/CPackIFWGenerator/_CPack_Packages/Linux/IFW/IFWOutput.log"
            "${CMake_BINARY_DIR}/Tests/CPackIFWGenerator/_CPack_Packages/Darwin/IFW/IFWOutput.log"
            "${CMake_BINARY_DIR}/Tests/CPackIFWGenerator/_CPack_Packages/win32/IFW/IFWOutput.log"
        )
    ENDIF ()

    IF (CTEST_TEST_CPACK)
        ADD_TEST(CPackUseDefaultVersion ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackUseDefaultVersion"
            "${CMake_BINARY_DIR}/Tests/CPackUseDefaultVersion"
            ${build_generator_args}
            --build-project CPackUseDefaultVersion
            --build-two-config
            --build-options
            ${CPackUseDefaultVersion_BUILD_OPTIONS})
        SET_TESTS_PROPERTIES(CPackUseDefaultVersion PROPERTIES PASS_REGULAR_EXPRESSION "CPACK_PACKAGE_VERSION=0\\.1\\.1")
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CPackUseDefaultVersion")

        ADD_TEST(CPackUseProjectVersion ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackUseProjectVersion"
            "${CMake_BINARY_DIR}/Tests/CPackUseProjectVersion"
            ${build_generator_args}
            --build-project CPackUseProjectVersion
            --build-two-config
            --build-options
            ${CPackUseProjectVersion_BUILD_OPTIONS})
        SET_TESTS_PROPERTIES(CPackUseProjectVersion PROPERTIES PASS_REGULAR_EXPRESSION "CPACK_PACKAGE_VERSION=1\\.2\\.3")
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CPackUseProjectVersion")

        ADD_TEST(CPackUseShortProjectVersion ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackUseShortProjectVersion"
            "${CMake_BINARY_DIR}/Tests/CPackUseShortProjectVersion"
            ${build_generator_args}
            --build-project CPackUseShortProjectVersion
            --build-two-config
            --build-options
            ${CPackUseProjectVersion_BUILD_OPTIONS})
        SET_TESTS_PROPERTIES(CPackUseShortProjectVersion PROPERTIES PASS_REGULAR_EXPRESSION "CPACK_PACKAGE_VERSION=2")
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CPackUseShortProjectVersion")
    ENDIF ()

    IF (CTEST_RUN_CPackComponents)
        SET(CPackComponents_BUILD_OPTIONS)
        IF (APPLE)
            SET(CPackComponents_BUILD_OPTIONS -DCPACK_BINARY_DRAGNDROP:BOOL=ON)
            IF (CMake_TEST_XCODE_VERSION VERSION_GREATER "4.6")
                SET(CPackComponents_BUILD_OPTIONS ${CPackComponents_BUILD_OPTIONS}
                    -DCPACK_BINARY_PRODUCTBUILD:BOOL=ON)
            ENDIF ()
        ENDIF ()
        IF (NSIS_MAKENSIS_EXECUTABLE)
            EXECUTE_PROCESS(COMMAND ${NSIS_MAKENSIS_EXECUTABLE} "-VERSION" ERROR_QUIET OUTPUT_QUIET RESULT_VARIABLE NSIS_OK)
            IF ("${NSIS_OK}" STREQUAL "0")
                SET(CPackComponents_BUILD_OPTIONS ${CPackComponents_BUILD_OPTIONS}
                    -DCPACK_BINARY_NSIS:BOOL=ON)
            ENDIF ()
        ENDIF ()

        ADD_TEST(CPackComponents ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackComponents"
            "${CMake_BINARY_DIR}/Tests/CPackComponents"
            ${build_generator_args}
            --build-project CPackComponents
            --build-two-config
            --build-target package
            --build-options
            -DCPACK_BINARY_DEB:BOOL=${CPACK_BINARY_DEB}
            -DCPACK_BINARY_RPM:BOOL=${CPACK_BINARY_RPM}
            ${CPackComponents_BUILD_OPTIONS}
            --graphviz=CPackComponents.dot
            --test-command ${CMAKE_CMAKE_COMMAND}
            "-DCPackComponents_BINARY_DIR:PATH=${CMake_BINARY_DIR}/Tests/CPackComponents"
            -P "${CMake_SOURCE_DIR}/Tests/CPackComponents/VerifyResult.cmake")
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CPackComponents")
    ENDIF ()

    IF (CTEST_RUN_CPackComponentsForAll)
        # Check whether if rpmbuild command is found
        # before adding RPM tests
        IF (CPACK_BINARY_RPM)
            LIST(APPEND ACTIVE_CPACK_GENERATORS RPM)
        ENDIF ()
        # Check whether if dpkg command is found
        # before adding DEB tests
        IF (CPACK_BINARY_DEB)
            LIST(APPEND ACTIVE_CPACK_GENERATORS DEB)
        ENDIF ()
        IF (CMake_TEST_CPACK_NUGET)
            LIST(APPEND ACTIVE_CPACK_GENERATORS NUGET)
            SET(CPACK_GENERATOR_STRING_NUGET NuGet)
        ENDIF ()

        # ACTIVE_CPACK_GENERATORS variable
        # now contains the list of 'active generators'
        SET(CPackComponentsForAll_BUILD_OPTIONS)
        # set up list of CPack generators
        LIST(APPEND ACTIVE_CPACK_GENERATORS "ZIP")
        IF (APPLE)
            LIST(APPEND ACTIVE_CPACK_GENERATORS "DragNDrop")
            IF (CMake_TEST_XCODE_VERSION VERSION_GREATER "4.6")
                LIST(APPEND ACTIVE_CPACK_GENERATORS "productbuild")
            ENDIF ()
        ENDIF ()

        # set up list of component packaging ways
        LIST(APPEND CWAYLST "default")
        LIST(APPEND CWAYLST "OnePackPerGroup")
        LIST(APPEND CWAYLST "IgnoreGroup")
        LIST(APPEND CWAYLST "AllInOne")
        FOREACH (CPackGen IN LISTS ACTIVE_CPACK_GENERATORS)
            IF (NOT DEFINED CPACK_GENERATOR_STRING_${CPackGen})
                SET(CPACK_GENERATOR_STRING_${CPackGen} ${CPackGen})
            ENDIF ()
            SET(CPackRun_CPackGen "-DCPackGen=${CPACK_GENERATOR_STRING_${CPackGen}}")
            FOREACH (CPackComponentWay IN LISTS CWAYLST)
                SET(CPackRun_CPackComponentWay "-DCPackComponentWay=${CPackComponentWay}")
                ADD_TEST(CPackComponentsForAll-${CPackGen}-${CPackComponentWay}
                    ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE}
                    --build-and-test
                    "${CMake_SOURCE_DIR}/Tests/CPackComponentsForAll"
                    "${CMake_BINARY_DIR}/Tests/CPackComponentsForAll/build${CPackGen}-${CPackComponentWay}"
                    ${build_generator_args}
                    --build-project CPackComponentsForAll
                    --build-options
                    -DCPACK_GENERATOR:STRING=${CPACK_GENERATOR_STRING_${CPackGen}}
                    -DCPACK_BINARY_${CPackGen}:BOOL=ON
                    ${CPackRun_CPackComponentWay}
                    ${CPackComponentsForAll_BUILD_OPTIONS}
                    --graphviz=CPackComponentsForAll.dot
                    --test-command ${CMAKE_CMAKE_COMMAND}
                    "-DCPackComponentsForAll_BINARY_DIR:PATH=${CMake_BINARY_DIR}/Tests/CPackComponentsForAll/build${CPackGen}-${CPackComponentWay}"
                    "${CPackRun_CPackGen}"
                    "${CPackRun_CPackComponentWay}"
                    -P "${CMake_SOURCE_DIR}/Tests/CPackComponentsForAll/RunCPackVerifyResult.cmake")
                LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CPackComponentsForAll/build${CPackGen}-${CPackComponentWay}")
            ENDFOREACH ()
        ENDFOREACH ()

        # debian specific
        IF (DPKG_EXECUTABLE)
            UNSET(CPackRun_CPackDEBConfiguration_ALL_CONFIGS)
            SET(DEB_TEST_NAMES "CPackComponentsDEB")
            SET(DEB_CONFIGURATIONS_TO_TEST "components-lintian-dpkgdeb-checks"
                "components-description1"
                "components-description2"
                "components-source"
                "components-shlibdeps1"
                "components-depend1"
                "compression")
            # Run additional tests if dpkg-shlibdeps is available (and is new enough version)
            FIND_PROGRAM(SHLIBDEPS_EXECUTABLE NAMES dpkg-shlibdeps)
            IF (SHLIBDEPS_EXECUTABLE)
                # Check version of the dpkg-shlibdeps tool
                EXECUTE_PROCESS(COMMAND ${CMAKE_COMMAND} -E env LC_ALL=C ${SHLIBDEPS_EXECUTABLE} --version
                    OUTPUT_VARIABLE _TMP_VERSION
                    ERROR_QUIET
                    OUTPUT_STRIP_TRAILING_WHITESPACE)
                IF (_TMP_VERSION MATCHES "dpkg-shlibdeps version ([0-9]+\\.[0-9]+\\.[0-9]+)")
                    SET(SHLIBDEPS_EXECUTABLE_VERSION "${CMAKE_MATCH_1}")
                ELSE ()
                    UNSET(SHLIBDEPS_EXECUTABLE_VERSION)
                ENDIF ()
                # Check if distro has symbols or shlibs data
                FILE(GLOB SHLIBS_FILES_EXIST "/var/lib/dpkg/info/*.shlibs" "/var/lib/dpkg/info/*.symbols")
                IF (NOT SHLIBDEPS_EXECUTABLE_VERSION VERSION_LESS 1.19 OR
                    (NOT SHLIBDEPS_EXECUTABLE_VERSION VERSION_LESS 1.17 AND NOT CMAKE_BINARY_DIR MATCHES ".*[ ].*"))
                    LIST(APPEND DEB_CONFIGURATIONS_TO_TEST "shlibdeps-with-private-lib-failure"
                        "shlibdeps-with-private-lib-success"
                        "shlibdeps-with-ORIGIN-RPATH-failure")
                    IF (SHLIBS_FILES_EXIST)
                        LIST(APPEND DEB_CONFIGURATIONS_TO_TEST "shlibdeps-with-ORIGIN-RPATH-success")
                    ENDIF ()
                ENDIF ()
                IF (SHLIBS_FILES_EXIST)
                    LIST(APPEND DEB_CONFIGURATIONS_TO_TEST "components-depend2")
                ENDIF ()
            ENDIF ()

            SET(CPackGen "DEB")
            SET(CPackRun_CPackGen "-DCPackGen=${CPackGen}")

            FOREACH (CPackDEBConfiguration IN LISTS DEB_CONFIGURATIONS_TO_TEST)
                SET(CPackRun_CPackDEBConfiguration "-DCPackDEBConfiguration=${CPackDEBConfiguration}")
                ADD_TEST(NAME ${DEB_TEST_NAMES}-${CPackDEBConfiguration} COMMAND
                    ${CMAKE_CTEST_COMMAND} -C $<CONFIG>
                    --build-and-test
                    "${CMake_SOURCE_DIR}/Tests/${DEB_TEST_NAMES}"
                    "${CMake_BINARY_DIR}/Tests/${DEB_TEST_NAMES}/build${CPackGen}-${CPackDEBConfiguration}"
                    ${build_generator_args}
                    --build-project CPackComponentsDEB
                    --build-options
                    -DCPACK_GENERATOR:STRING=${CPackGen}
                    -DCPACK_BINARY_${CPackGen}:BOOL=ON
                    ${CPackRun_CPackDEBConfiguration}
                    ${CPackRun_CPackDEBConfiguration_ALL_CONFIGS}
                    --graphviz=${DEB_TEST_NAMES}.dot
                    --test-command ${CMAKE_CMAKE_COMMAND}
                    "-D${DEB_TEST_NAMES}_SOURCE_DIR:PATH=${CMake_SOURCE_DIR}/Tests/${DEB_TEST_NAMES}"
                    "-D${DEB_TEST_NAMES}_BINARY_DIR:PATH=${CMake_BINARY_DIR}/Tests/${DEB_TEST_NAMES}/build${CPackGen}-${CPackDEBConfiguration}"
                    "${CPackRun_CPackGen}"
                    "${CPackRun_CPackDEBConfiguration}"
                    "-DCONFIG=$<CONFIG>"
                    -P "${CMake_SOURCE_DIR}/Tests/${DEB_TEST_NAMES}/RunCPackVerifyResult-${CPackDEBConfiguration}.cmake")
                LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${DEB_TEST_NAMES}/build${CPackGen}-${CPackDEBConfiguration}")
            ENDFOREACH ()
        ENDIF ()

    ENDIF ()

    # By default, turn this test off (because it takes a long time...)
    #
    IF (NOT DEFINED CTEST_RUN_CPackTestAllGenerators)
        SET(CTEST_RUN_CPackTestAllGenerators OFF)

        # ...but: if it appears to be a coverage dashboard, or long tests are
        # on, then set it to the generic CTEST_TEST_CPACK setting.
        #
        IF (CMAKE_CXX_FLAGS MATCHES "-ftest-coverage" OR
            NOT "$ENV{COVFILE}" STREQUAL "" OR
            CMAKE_RUN_LONG_TESTS)
            SET(CTEST_RUN_CPackTestAllGenerators ${CTEST_TEST_CPACK})
        ENDIF ()
    ENDIF ()

    IF (CTEST_RUN_CPackTestAllGenerators)
        ADD_TEST(CPackTestAllGenerators ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackTestAllGenerators"
            "${CMake_BINARY_DIR}/Tests/CPackTestAllGenerators"
            ${build_generator_args}
            --build-project CPackTestAllGenerators
            --test-command
            ${CMAKE_CMAKE_COMMAND}
            -D dir=${CMake_BINARY_DIR}/Tests/CPackTestAllGenerators
            -P ${CMake_SOURCE_DIR}/Tests/CPackTestAllGenerators/RunCPack.cmake
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CPackTestAllGenerators")
    ENDIF ()

    IF (CTEST_RUN_CPackComponentsPrefix)
        SET(CPackComponents_BUILD_OPTIONS)
        IF (APPLE)
            SET(CPackComponents_BUILD_OPTIONS -DCPACK_BINARY_DRAGNDROP:BOOL=ON)
            IF (CMake_TEST_XCODE_VERSION VERSION_GREATER "4.6")
                SET(CPackComponents_BUILD_OPTIONS ${CPackComponents_BUILD_OPTIONS}
                    -DCPACK_BINARY_PRODUCTBUILD:BOOL=ON)
            ENDIF ()
        ENDIF ()
        IF (NOT NSIS_MAKENSIS_EXECUTABLE)
            SET(CPackComponents_BUILD_OPTIONS ${CPackComponents_BUILD_OPTIONS}
                -DCPACK_BINARY_NSIS:BOOL=OFF)
        ENDIF ()

        ADD_TEST(CPackComponentsPrefix ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/CPackComponentsPrefix"
            "${CMake_BINARY_DIR}/Tests/CPackComponentsPrefix"
            ${build_generator_args}
            --build-project CPackComponentsPrefix
            --build-two-config
            --build-target package
            --build-options
            -DCPACK_BINARY_DEB:BOOL=${CPACK_BINARY_DEB}
            -DCPACK_BINARY_RPM:BOOL=${CPACK_BINARY_RPM}
            -DCPACK_BINARY_ZIP:BOOL=ON
            ${CPackComponents_BUILD_OPTIONS}
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CPackComponentsPrefix")
    ENDIF ()

    IF (CTEST_package_X11_TEST)
        SET(X11_build_target_arg --build-target package)
    ELSE ()
        SET(X11_build_target_arg)
    ENDIF ()

    ADD_TEST(X11 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/X11"
        "${CMake_BINARY_DIR}/Tests/X11"
        ${build_generator_args}
        --build-project UseX11
        --build-two-config
        ${X11_build_target_arg}
        --test-command UseX11)
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/X11")

    IF (NOT DEFINED CTEST_RUN_CMakeTestAllGenerators)
        SET(CTEST_RUN_CMakeTestAllGenerators ON)
    ENDIF ()

    IF (CTEST_RUN_CMakeTestAllGenerators)
        ADD_TEST(CMakeTestAllGenerators ${CMAKE_CMAKE_COMMAND}
            -D dir=${CMake_BINARY_DIR}/Tests/CMakeTestAllGenerators
            -D CMake_SOURCE_DIR=${CMake_SOURCE_DIR}
            -P ${CMake_SOURCE_DIR}/Tests/CMakeTestAllGenerators/RunCMake.cmake
        )
        LIST(APPEND TEST_BUILD_DIRS
            "${CMake_BINARY_DIR}/Tests/CMakeTestAllGenerators")
        # This test runs a lot of processes.  Do not make them compete
        # for resources with other tests.
        SET_PROPERTY(TEST CMakeTestAllGenerators PROPERTY RUN_SERIAL 1)
    ENDIF ()

    ADD_TEST(complex ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Complex"
        "${CMake_BINARY_DIR}/Tests/Complex"
        --build-two-config
        --build-config-sample "${CMAKE_CTEST_COMMAND}"
        ${build_generator_args}
        --build-project Complex
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Complex/bin"
        -DCMAKE_BUILD_TYPE:STRING=${CMAKE_BUILD_TYPE}
        --test-command complex
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Complex")

    ADD_TEST(complexOneConfig ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ComplexOneConfig"
        "${CMake_BINARY_DIR}/Tests/ComplexOneConfig"
        ${build_generator_args}
        --build-project Complex
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/ComplexOneConfig/bin"
        -DCMAKE_BUILD_TYPE:STRING=${CMAKE_BUILD_TYPE}
        --test-command complex)
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ComplexOneConfig")
    # because of the registry write these tests depend on each other
    SET_TESTS_PROPERTIES(complex PROPERTIES DEPENDS complexOneConfig)

    ADD_TEST(Environment ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Environment"
        "${CMake_BINARY_DIR}/Tests/Environment"
        ${build_generator_args}
        --build-project EnvironmentProj
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Environment"
        --test-command ${CMAKE_CTEST_COMMAND} -V
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Environment")
    SET_PROPERTY(TEST Environment APPEND
        PROPERTY ENVIRONMENT
        "SET_FROM_AMBIENT_unset=base"
        "SET_FROM_AMBIENT_replace=base"
        "SET_FROM_AMBIENT_string=base"
        "SET_FROM_AMBIENT_path=base"
        "SET_FROM_AMBIENT_list=base")

    ADD_TEST(QtAutomocNoQt ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/QtAutomocNoQt"
        "${CMake_BINARY_DIR}/Tests/QtAutomocNoQt"
        ${build_generator_args}
        --build-project QtAutomocNoQt
        --build-options
        -DCMAKE_BUILD_TYPE=\${CTEST_CONFIGURATION_TYPE}
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/QtAutomocNoQt")

    IF (CMake_TEST_Qt6 AND Qt6Widgets_FOUND)
        ADD_SUBDIRECTORY(Qt6Autogen)
    ENDIF ()
    IF (CMake_TEST_Qt5 AND Qt5Widgets_FOUND)
        ADD_SUBDIRECTORY(Qt5Autogen)
    ENDIF ()
    IF (QT4_WORKS AND QT_QTGUI_FOUND)
        ADD_SUBDIRECTORY(Qt4Autogen)

        ADD_TEST(Qt4Targets ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/Qt4Targets"
            "${CMake_BINARY_DIR}/Tests/Qt4Targets"
            ${build_generator_args}
            --build-project Qt4Targets
            --build-exe-dir "${CMake_BINARY_DIR}/Tests/Qt4Targets"
            --build-options
            -DQT_QMAKE_EXECUTABLE:FILEPATH=${QT_QMAKE_EXECUTABLE}
            --test-command ${CMAKE_CTEST_COMMAND} -V
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Qt4Targets")

        IF (Qt5Widgets_FOUND AND NOT Qt5Widgets_VERSION VERSION_LESS 5.1.0)
            ADD_TEST(Qt4And5AutomocForward ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/Qt4And5Automoc"
                "${CMake_BINARY_DIR}/Tests/Qt4And5AutomocForward"
                ${build_generator_args}
                --build-project Qt4And5Automoc
                --build-exe-dir "${CMake_BINARY_DIR}/Tests/Qt4And5AutomocForward"
                --test-command ${CMAKE_CTEST_COMMAND} -V
            )
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Qt4And5AutomocForward")
            ADD_TEST(Qt4And5AutomocReverse ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/Qt4And5Automoc"
                "${CMake_BINARY_DIR}/Tests/Qt4And5AutomocReverse"
                ${build_generator_args}
                --build-project Qt4And5Automoc
                --build-exe-dir "${CMake_BINARY_DIR}/Tests/Qt4And5AutomocReverse"
                --build-options -DQT_REVERSE_FIND_ORDER=1
                --test-command ${CMAKE_CTEST_COMMAND} -V
            )
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Qt4And5AutomocReverse")
        ENDIF ()
    ENDIF ()

    # test for Find modules, simple cases
    FOREACH (
        _mod
        IN ITEMS
        ALSA
        ASPELL
        Backtrace
        BLAS
        Boost
        BZip2
        Cups
        CURL
        DevIL
        Doxygen
        EnvModules
        EXPAT
        Fontconfig
        Freetype
        GDAL
        GIF
        Git
        GLEW
        GLUT
        GnuTLS
        GSL
        GTK2
        HDF5
        Iconv
        ICU
        ImageMagick
        Intl
        Jasper
        JNI
        JPEG
        JsonCpp
        LAPACK
        LibArchive
        Libinput
        LibLZMA
        LibRHash
        LibUV
        LibXml2
        LibXslt
        LTTngUST
        MPI
        ODBC
        OpenACC
        OpenAL
        OpenCL
        OpenGL
        OpenMP
        OpenSP
        OpenSSL
        Patch
        PNG
        PostgreSQL
        Protobuf
        SDL
        SQLite3
        TIFF
        Vulkan
        wxWidgets
        X11
        XalanC
        XercesC
    )
        IF (CMake_TEST_Find${_mod})
            ADD_SUBDIRECTORY(Find${_mod})
        ENDIF ()
    ENDFOREACH ()

    IF (CMake_TEST_CUDA)
        ADD_SUBDIRECTORY(Cuda)
        ADD_SUBDIRECTORY(CudaOnly)
    ENDIF ()

    IF (CMake_TEST_HIP)
        ADD_SUBDIRECTORY(HIP)
    ENDIF ()

    IF (CMake_TEST_ISPC)
        ADD_SUBDIRECTORY(ISPC)
    ENDIF ()

    IF (CMake_TEST_FindGTest)
        ADD_SUBDIRECTORY(FindGTest)
        ADD_SUBDIRECTORY(GoogleTest)
    ENDIF ()

    IF (CMake_TEST_UseSWIG)
        ADD_SUBDIRECTORY(UseSWIG)
    ENDIF ()

    IF (CMake_TEST_FindRuby)
        ADD_SUBDIRECTORY(FindRuby)
    ENDIF ()

    ADD_SUBDIRECTORY(FindThreads)

    # Matlab module
    # CMake_TEST_FindMatlab: indicates to look for Matlab (from PATH for Linux)
    # CMake_TEST_FindMatlab_ROOT_DIR: indicates an optional root directory for Matlab, allows to select a version.
    # CMake_TEST_FindMatlab_MCR: indicates the MCR is installed
    # CMake_TEST_FindMatlab_MCR_ROOT_DIR: indicates an optional root directory for the MCR, required on Linux
    IF (CMake_TEST_FindMatlab OR CMake_TEST_FindMatlab_ROOT_DIR OR
        CMake_TEST_FindMatlab_MCR OR CMake_TEST_FindMatlab_MCR_ROOT_DIR)
        SET(FindMatlab_additional_test_options)
        IF (CMake_TEST_FindMatlab_MCR OR CMake_TEST_FindMatlab_MCR_ROOT_DIR)
            SET(FindMatlab_additional_test_options -DIS_MCR=TRUE)
        ENDIF ()
        IF (CMake_TEST_FindMatlab_ROOT_DIR)
            SET(FindMatlab_additional_test_options ${FindMatlab_additional_test_options} "-DMatlab_ROOT_DIR=${CMake_TEST_FindMatlab_ROOT_DIR}")
        ENDIF ()
        IF (CMake_TEST_FindMatlab_MCR_ROOT_DIR)
            SET(FindMatlab_additional_test_options ${FindMatlab_additional_test_options} "-DMCR_ROOT:FILEPATH=${CMake_TEST_FindMatlab_MCR_ROOT_DIR}")
        ENDIF ()
        SET(FindMatlab.basic_checks_BUILD_OPTIONS ${FindMatlab_additional_test_options})
        ADD_TEST_MACRO(FindMatlab.basic_checks ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
        SET_PROPERTY(TEST FindMatlab.basic_checks APPEND PROPERTY LABELS "Matlab")
        SET(FindMatlab.versions_checks_BUILD_OPTIONS ${FindMatlab_additional_test_options})
        ADD_TEST_MACRO(FindMatlab.versions_checks ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
        SET_PROPERTY(TEST FindMatlab.versions_checks APPEND PROPERTY LABELS "Matlab")
        SET(FindMatlab.components_checks_BUILD_OPTIONS ${FindMatlab_additional_test_options})
        ADD_TEST_MACRO(FindMatlab.components_checks ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
        SET_PROPERTY(TEST FindMatlab.components_checks APPEND PROPERTY LABELS "Matlab")
        SET(FindMatlab.failure_reports_BUILD_OPTIONS ${FindMatlab_additional_test_options})
        ADD_TEST_MACRO(FindMatlab.failure_reports ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
        SET_PROPERTY(TEST FindMatlab.failure_reports APPEND PROPERTY LABELS "Matlab")
        SET(FindMatlab.r2018a_check_BUILD_OPTIONS ${FindMatlab_additional_test_options})
        ADD_TEST_MACRO(FindMatlab.r2018a_check ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
        SET_PROPERTY(TEST FindMatlab.r2018a_check APPEND PROPERTY LABELS "Matlab")
        SET(FindMatlab.targets_checks_BUILD_OPTIONS ${FindMatlab_additional_test_options})
        ADD_TEST_MACRO(FindMatlab.targets_checks ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
        SET_PROPERTY(TEST FindMatlab.targets_checks APPEND PROPERTY LABELS "Matlab")
        SET(FindMatlab.no_implicit_link_checks_BUILD_OPTIONS ${FindMatlab_additional_test_options})
        ADD_TEST_MACRO(FindMatlab.no_implicit_link_checks ${CMAKE_CTEST_COMMAND} -V -C $<CONFIGURATION>)
        SET_PROPERTY(TEST FindMatlab.no_implicit_link_checks APPEND PROPERTY LABELS "Matlab")
    ENDIF ()

    SET(ExternalProject_BUILD_OPTIONS "")
    FOREACH (vcs IN ITEMS CVS SVN GIT HG)
        IF (DEFINED CMake_TEST_ExternalProject_${vcs})
            LIST(APPEND ExternalProject_BUILD_OPTIONS -DEP_TEST_${vcs}=${CMake_TEST_ExternalProject_${vcs}})
        ENDIF ()
    ENDFOREACH ()
    ADD_TEST(ExternalProject ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ExternalProject"
        "${CMake_BINARY_DIR}/Tests/ExternalProject"
        ${build_generator_args}
        --build-project ExternalProjectTest
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/ExternalProject"
        --build-options ${ExternalProject_BUILD_OPTIONS}
        --test-command ${CMAKE_CTEST_COMMAND} -V
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ExternalProject")
    SET_TESTS_PROPERTIES(ExternalProject PROPERTIES
        ENVIRONMENT GIT_ALLOW_PROTOCOL=file
        RUN_SERIAL 1
        TIMEOUT ${CMAKE_LONG_TEST_TIMEOUT})

    ADD_TEST(NAME ExternalProjectSubdir
        COMMAND ${CMAKE_CTEST_COMMAND} -C $<CONFIGURATION>
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ExternalProjectSubdir"
        "${CMake_BINARY_DIR}/Tests/ExternalProjectSubdir"
        ${build_generator_args}
        --build-project ExternalProjectSubdir
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ExternalProjectSubdir")

    ADD_TEST(NAME ExternalProjectSourceSubdir
        COMMAND ${CMAKE_CTEST_COMMAND} -C $<CONFIGURATION>
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ExternalProjectSourceSubdir"
        "${CMake_BINARY_DIR}/Tests/ExternalProjectSourceSubdir"
        ${build_generator_args}
        --build-project ExternalProjectSourceSubdir
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ExternalProjectSourceSubdir")

    ADD_TEST(NAME ExternalProjectSourceSubdirNotCMake
        COMMAND ${CMAKE_CTEST_COMMAND} -C $<CONFIGURATION>
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ExternalProjectSourceSubdirNotCMake"
        "${CMake_BINARY_DIR}/Tests/ExternalProjectSourceSubdirNotCMake"
        ${build_generator_args}
        --build-project ExternalProjectSourceSubdirNotCMake
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ExternalProjectSourceSubdirNotCMake")

    ADD_TEST(ExternalProjectLocal ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ExternalProjectLocal"
        "${CMake_BINARY_DIR}/Tests/ExternalProjectLocal"
        ${build_generator_args}
        --build-project ExternalProjectLocalTest
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/ExternalProjectLocal"
        --test-command ${CMAKE_CTEST_COMMAND} -V
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ExternalProjectLocal")
    SET_TESTS_PROPERTIES(ExternalProjectLocal PROPERTIES
        RUN_SERIAL 1
        TIMEOUT ${CMAKE_LONG_TEST_TIMEOUT})

    ADD_TEST(ExternalProjectUpdateSetup ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/ExternalProjectUpdate"
        "${CMake_BINARY_DIR}/Tests/ExternalProjectUpdate"
        ${build_generator_args}
        --build-project ExternalProjectUpdateTest
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/ExternalProjectUpdate"
        --test-command ${CMAKE_CTEST_COMMAND} -V
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ExternalProjectUpdate")
    SET_TESTS_PROPERTIES(ExternalProjectUpdateSetup PROPERTIES
        RUN_SERIAL 1
        TIMEOUT ${CMAKE_LONG_TEST_TIMEOUT})

    ADD_TEST(NAME ExternalProjectUpdate
        COMMAND ${CMAKE_CMAKE_COMMAND}
        -DExternalProjectUpdate_SOURCE_DIR:PATH=${CMake_SOURCE_DIR}/Tests/ExternalProjectUpdate
        -DExternalProjectUpdate_BINARY_DIR:PATH=${CMake_BINARY_DIR}/Tests/ExternalProjectUpdate
        -DCMAKE_GENERATOR=${CMAKE_GENERATOR}
        -DCMAKE_GENERATOR_PLATFORM=${CMAKE_GENERATOR_PLATFORM}
        -DCMAKE_GENERATOR_TOOLSET=${CMAKE_GENERATOR_TOOLSET}
        -DCMAKE_CTEST_COMMAND=${CMAKE_CTEST_COMMAND}
        -P ${CMake_SOURCE_DIR}/Tests/ExternalProjectUpdate/ExternalProjectUpdateTest.cmake
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/ExternalProjectUpdate")
    SET_TESTS_PROPERTIES(ExternalProjectUpdate PROPERTIES
        RUN_SERIAL 1
        TIMEOUT ${CMAKE_LONG_TEST_TIMEOUT}
        WORKING_DIRECTORY ${CMake_SOURCE_DIR}/Tests/ExternalProjectUpdate
        DEPENDS ExternalProjectUpdateSetup
    )

    EXECUTE_PROCESS(
        COMMAND ${CMAKE_COMMAND}
        "-E" create_symlink
        "${CMake_SOURCE_DIR}/Tests/CMakeLists.txt" # random source file that exists
        "${CMake_BINARY_DIR}/Tests/try_to_create_symlink" # random target file in existing directory
        RESULT_VARIABLE _symlink_result
        OUTPUT_VARIABLE _symlink_stdout
        ERROR_VARIABLE _symlink_stderr
    )
    IF (_symlink_result EQUAL 0)
        FILE(REMOVE "${CMake_BINARY_DIR}/Tests/try_to_create_symlink")
        FUNCTION(add_installmode_test _mode)
            SET(ENV{CMAKE_INSTALL_MODE} _mode)
            SET(_maybe_InstallMode_CTEST_OPTIONS)
            SET(_maybe_BUILD_OPTIONS)
            IF (_isMultiConfig)
                SET(_maybe_CTEST_OPTIONS -C $<CONFIGURATION>)
            ELSE ()
                SET(_maybe_BUILD_OPTIONS "-DCMAKE_BUILD_TYPE=$<CONFIGURATION>")
            ENDIF ()
            ADD_TEST(
                NAME "InstallMode-${_mode}"
                COMMAND
                ${CMAKE_CTEST_COMMAND} -V ${_maybe_CTEST_OPTIONS}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/InstallMode"
                "${CMake_BINARY_DIR}/Tests/InstallMode-${_mode}"
                ${build_generator_args}
                --build-project superpro
                --build-exe-dir "${CMake_BINARY_DIR}/Tests/InstallMode-${_mode}"
                --build-options
                ${_maybe_BUILD_OPTIONS}
                "-DCMAKE_INSTALL_PREFIX:PATH=${CMake_BINARY_DIR}/Tests/InstallMode-${_mode}/install"
            )
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/InstallMode-${_mode}")
            UNSET(ENV{CMAKE_INSTALL_MODE})
        ENDFUNCTION()

        ADD_INSTALLMODE_TEST(COPY)
        ADD_INSTALLMODE_TEST(REL_SYMLINK)
        ADD_INSTALLMODE_TEST(REL_SYMLINK_OR_COPY)
        ADD_INSTALLMODE_TEST(ABS_SYMLINK)
        ADD_INSTALLMODE_TEST(ABS_SYMLINK_OR_COPY)
        ADD_INSTALLMODE_TEST(SYMLINK)
        ADD_INSTALLMODE_TEST(SYMLINK_OR_COPY)
    ENDIF ()

    FUNCTION(add_importexport_test export_name import_name)
        SET(install_dir
            "${CMake_BINARY_DIR}/Tests/ImportExport/Install${export_name}")
        SET(export_build_dir "${CMake_BINARY_DIR}/Tests/ImportExport/${export_name}Build")
        SET(export_test_name "Guide.ImportExport.${export_name}")
        ADD_TEST(${export_test_name} ${CMAKE_CTEST_COMMAND}
            -C "Release"
            --build-and-test
            "${CMake_SOURCE_DIR}/Help/guide/importing-exporting/${export_name}"
            "${export_build_dir}"
            ${build_generator_args}
            --build-project ${export_name}
            --build-target install
            --build-options
            "-DCMAKE_INSTALL_PREFIX:PATH=${install_dir}")
        LIST(APPEND TEST_BUILD_DIRS "${export_build_dir}")

        SET(import_build_dir "${CMake_BINARY_DIR}/Tests/ImportExport/${import_name}Build")
        SET(import_test_name "Guide.ImportExport.${import_name}")
        ADD_TEST(${import_test_name} ${CMAKE_CTEST_COMMAND}
            -C "Release"
            --build-and-test
            "${CMake_SOURCE_DIR}/Help/guide/importing-exporting/${import_name}"
            "${import_build_dir}"
            ${build_generator_args}
            --build-project ${import_name}
            --build-options
            "-DCMAKE_PREFIX_PATH:PATH=${install_dir}")
        SET_TESTS_PROPERTIES(${import_test_name} PROPERTIES DEPENDS ${export_test_name})
        LIST(APPEND TEST_BUILD_DIRS "${import_build_dir}")
    ENDFUNCTION()

    IF (NOT CMake_TEST_EXTERNAL_CMAKE)
        ADD_IMPORTEXPORT_TEST("MyExe" "Importing")
        ADD_IMPORTEXPORT_TEST("MathFunctions" "Downstream")
        ADD_IMPORTEXPORT_TEST("MathFunctionsComponents" "DownstreamComponents")
    ENDIF ()

    ADD_TEST(testing ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Testing"
        "${CMake_BINARY_DIR}/Tests/Testing"
        ${build_generator_args}
        --build-project Testing
        --test-command ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE}
    )
    SET_TESTS_PROPERTIES(testing PROPERTIES PASS_REGULAR_EXPRESSION "Passed")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Testing")

    ADD_TEST(wrapping ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Wrapping"
        "${CMake_BINARY_DIR}/Tests/Wrapping"
        ${build_generator_args}
        --build-project Wrapping
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Wrapping/bin"
        --test-command wrapping
    )
    ADD_TEST(qtwrapping ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Wrapping"
        "${CMake_BINARY_DIR}/Tests/Wrapping"
        ${build_generator_args}
        --build-project Wrapping
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Wrapping/bin"
        --test-command qtwrapping
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Wrapping")

    ADD_TEST(testdriver1 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/TestDriver"
        "${CMake_BINARY_DIR}/Tests/TestDriver1"
        ${build_generator_args}
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Wrapping/bin"
        --build-project TestDriverTest
        --test-command TestDriverTest test1
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/TestDriver1")

    ADD_TEST(testdriver2 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/TestDriver"
        "${CMake_BINARY_DIR}/Tests/TestDriver2"
        ${build_generator_args}
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Wrapping/bin"
        --build-project TestDriverTest
        --test-command TestDriverTest test2
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/TestDriver2")

    ADD_TEST(testdriver3 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/TestDriver"
        "${CMake_BINARY_DIR}/Tests/TestDriver3"
        ${build_generator_args}
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Wrapping/bin"
        --build-project TestDriverTest
        --test-command TestDriverTest subdir/test3
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/TestDriver3")

    ADD_TEST(testdriver4 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/TestDriver"
        "${CMake_BINARY_DIR}/Tests/TestDriver4"
        ${build_generator_args}
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Wrapping/bin"
        --build-project TestDriverTest
        --test-command TestDriverTest -A test2
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/TestDriver4")

    ADD_TEST(testdriver5 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/TestDriver"
        "${CMake_BINARY_DIR}/Tests/TestDriver5"
        ${build_generator_args}
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Wrapping/bin"
        --build-project TestDriverTest
        --test-command TestDriverTest -A test2
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/TestDriver5")
    SET_TESTS_PROPERTIES(testdriver5 PROPERTIES
        PASS_REGULAR_EXPRESSION
        "TAP version 13\n1\\.\\.3.+ok 1 test1 # [0-9]+\\.[0-9]+.*All tests finished."
    )

    ADD_TEST(Dependency ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/Dependency"
        "${CMake_BINARY_DIR}/Tests/Dependency"
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/Dependency/Exec"
        ${build_generator_args}
        --build-project Dependency
        --test-command exec
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Dependency")

    IF (CMAKE_SYSTEM_NAME MATCHES syllable)

        # RPATH isn't supported under Syllable, so the tests don't
        # find their libraries. In order to fix that LIBRARY_OUTPUT_DIR
        # in the tests would have to be adjusted to ${EXECUTABLE_OUTPUT_DIR}/lib .
        # For now we just require on Syllable that the user adjusts the DLL_PATH
        # environment variable, so except the two tests below all other tests will succeed.

        SET(_DLL_PATH "$ENV{DLL_PATH}")
        IF (NOT "${_DLL_PATH}" MATCHES "^(.*:)?\\@bindir\\@/\\.(:.*)?$")
            MESSAGE(FATAL_ERROR "In order to successfully run the CMake test suite on Syllable you need to add \"\\@bindir\\@/.\" to the DLL_PATH environment variable")
        ENDIF ()
        IF (NOT "${_DLL_PATH}" MATCHES "^(.*:)?\\@bindir\\@/\\.\\./lib(:.*)?$")
            MESSAGE(FATAL_ERROR "In order to successfully run the CMake test suite on Syllable you need to add \"\\@bindir\\@/../lib\" to the DLL_PATH environment variable")
        ENDIF ()

    ELSE ()

        ADD_TEST(JumpWithLibOut ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/Jump"
            "${CMake_BINARY_DIR}/Tests/Jump/WithLibOut"
            --build-exe-dir "${CMake_BINARY_DIR}/Tests/Jump/WithLibOut/Executable"
            --build-project Jump
            ${build_generator_args}
            --build-options
            -DLIBRARY_OUTPUT_PATH:PATH=${CMake_BINARY_DIR}/Tests/Jump/WithLibOut/Lib
            --test-command jumpExecutable
        )

        ADD_TEST(JumpNoLibOut ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/Jump"
            "${CMake_BINARY_DIR}/Tests/Jump/NoLibOut"
            --build-exe-dir "${CMake_BINARY_DIR}/Tests/Jump/NoLibOut/Executable"
            --build-run-dir "${CMake_BINARY_DIR}/Tests/Jump/NoLibOut/Executable"
            --build-project Jump
            ${build_generator_args}
            --test-command jumpExecutable
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Jump")

        ADD_TEST(Plugin ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/Plugin"
            "${CMake_BINARY_DIR}/Tests/Plugin"
            ${build_generator_args}
            --build-project Plugin
            --build-two-config
            --test-command bin/example)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Plugin")

        IF (CMAKE_SHARED_LIBRARY_RUNTIME_C_FLAG)
            ADD_TEST_MACRO(RuntimePath RuntimePath)
        ENDIF ()
    ENDIF ()

    IF (APPLE AND "${DARWIN_MAJOR_VERSION}" GREATER 9)
        ADD_TEST(MacRuntimePath ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/MacRuntimePath"
            "${CMake_BINARY_DIR}/Tests/MacRuntimePath"
            ${build_generator_args}
            --build-project MacRuntimePath
            --build-options
            -DCMake_TEST_NESTED_MAKE_PROGRAM:FILEPATH=${CMake_TEST_EXPLICIT_MAKE_PROGRAM}
        )
    ENDIF ()

    IF (CMake_TEST_XCODE_VERSION AND NOT CMake_TEST_XCODE_VERSION VERSION_LESS 5)
        IF (NOT CMake_TEST_XCTest_DEPLOYMENT_TARGET)
            EXECUTE_PROCESS(
                COMMAND sw_vers -productVersion
                OUTPUT_VARIABLE OSX_VERSION
                OUTPUT_STRIP_TRAILING_WHITESPACE
            )
            IF (OSX_VERSION MATCHES "^([0-9]+\\.[0-9]+)")
                SET(CMake_TEST_XCTest_DEPLOYMENT_TARGET "${CMAKE_MATCH_1}")
            ENDIF ()
        ENDIF ()
        IF (CMake_TEST_XCTest_DEPLOYMENT_TARGET)
            SET(XCTest_CTEST_OPTIONS --build-config $<CONFIGURATION>)
            SET(XCTest_BUILD_OPTIONS -DCMAKE_OSX_DEPLOYMENT_TARGET=${CMake_TEST_XCTest_DEPLOYMENT_TARGET} -DCMAKE_OSX_SYSROOT=macosx)
            ADD_TEST_MACRO(XCTest ${CMAKE_CTEST_COMMAND} -C $<CONFIGURATION> -V)
        ENDIF ()
    ENDIF ()

    ADD_TEST(linkorder1 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/LinkLineOrder"
        "${CMake_BINARY_DIR}/Tests/LinkLineOrder"
        ${build_generator_args}
        --build-project LinkLineOrder
        --test-command Exec1
    )

    ADD_TEST(linkorder2 ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/LinkLineOrder"
        "${CMake_BINARY_DIR}/Tests/LinkLineOrder"
        ${build_generator_args}
        --build-project LinkLineOrder
        --test-command Exec2
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/LinkLineOrder")
    SET_TESTS_PROPERTIES(qtwrapping PROPERTIES DEPENDS wrapping)
    SET_TESTS_PROPERTIES(testdriver1 PROPERTIES DEPENDS qtwrapping)
    SET_TESTS_PROPERTIES(testdriver2 PROPERTIES DEPENDS testdriver1)
    SET_TESTS_PROPERTIES(testdriver3 PROPERTIES DEPENDS testdriver2)
    SET_TESTS_PROPERTIES(linkorder2 PROPERTIES DEPENDS linkorder1)

    # Test static linking on toolchains known to support it.
    IF ((CMAKE_C_COMPILER_ID STREQUAL "GNU" OR CMAKE_C_COMPILER_ID STREQUAL "LCC")
        AND NOT APPLE AND NOT WIN32 AND NOT CYGWIN
        AND EXISTS "/usr/lib/libm.a")
        ADD_TEST(LinkStatic ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/LinkStatic"
            "${CMake_BINARY_DIR}/Tests/LinkStatic"
            ${build_generator_args}
            --build-project LinkStatic
            --build-options
            -DMATH_LIBRARY:FILEPATH=/usr/lib/libm.a
            --test-command LinkStatic
        )
    ENDIF ()

    IF (MAKE_SUPPORTS_SPACES
        AND NOT CMAKE_GENERATOR STREQUAL "Xcode"
        AND NOT CMAKE_GENERATOR STREQUAL "Watcom WMake"
    )
        ADD_TEST(SubDirSpaces ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/SubDirSpaces"
            "${CMake_BINARY_DIR}/Tests/SubDirSpaces"
            --build-exe-dir
            "${CMake_BINARY_DIR}/Tests/SubDirSpaces/Executable Sources"
            ${build_generator_args}
            --build-project SUBDIR
            --test-command test
            "${CMake_BINARY_DIR}/Tests/SubDirSpaces/ShouldBeHere"
            "${CMake_BINARY_DIR}/Tests/SubDirSpaces/testfromsubdir.obj"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/SubDirSpaces")
    ENDIF ()

    IF (WIN32)
        ADD_TEST(SubDir ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/SubDir"
            "${CMake_BINARY_DIR}/Tests/SubDir"
            --build-exe-dir "${CMake_BINARY_DIR}/Tests/SubDir/Executable"
            ${build_generator_args}
            --build-project SUBDIR
            --test-command test
            "${CMake_BINARY_DIR}/Tests/SubDir/ShouldBeHere"
            "${CMake_BINARY_DIR}/Tests/SubDir/testfromsubdir.obj"
        )
    ELSE ()
        ADD_TEST(SubDir ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/SubDir"
            "${CMake_BINARY_DIR}/Tests/SubDir"
            --build-exe-dir "${CMake_BINARY_DIR}/Tests/SubDir/Executable"
            ${build_generator_args}
            --build-project SUBDIR
            --test-command test
            "${CMake_BINARY_DIR}/Tests/SubDir/ShouldBeHere"
            "${CMake_BINARY_DIR}/Tests/SubDir/testfromsubdir.o"
        )
    ENDIF ()
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/SubDir")

    IF (MSVC OR (CMAKE_C_COMPILER_ID STREQUAL "Clang" AND CMAKE_C_SIMULATE_ID STREQUAL "MSVC"))
        ADD_TEST_MACRO(PDBDirectoryAndName myexe)
        IF (NOT CMAKE_C_COMPILER_ID STREQUAL "Clang" OR NOT "x${CMAKE_C_COMPILER_FRONTEND_VARIANT}" STREQUAL "xGNU")
            ADD_TEST_MACRO(ForceInclude foo)
        ENDIF ()
        IF (NOT CMAKE_C_COMPILER_ID STREQUAL "Clang" AND NOT CMAKE_C_COMPILER_ID STREQUAL "IntelLLVM")
            ADD_TEST_MACRO(PrecompiledHeader foo)
        ENDIF ()

        SET(MSVCDebugInformationFormat_BUILD_OPTIONS -DCMake_TEST_CUDA=${CMake_TEST_CUDA})
        IF (CMAKE_Fortran_COMPILER)
            LIST(APPEND MSVCDebugInformationFormat_BUILD_OPTIONS -DCMake_TEST_Fortran=1)
        ENDIF ()
        ADD_TEST_MACRO(MSVCDebugInformationFormat)
        SET_PROPERTY(TEST MSVCDebugInformationFormat APPEND
            PROPERTY LABELS "CUDA" "Fortran")

        SET(MSVCRuntimeChecks_BUILD_OPTIONS -DCMake_TEST_CUDA=${CMake_TEST_CUDA})
        IF (CMAKE_Fortran_COMPILER)
            LIST(APPEND MSVCRuntimeChecks_BUILD_OPTIONS -DCMake_TEST_Fortran=1)
        ENDIF ()
        ADD_TEST_MACRO(MSVCRuntimeChecks)
        SET_PROPERTY(TEST MSVCRuntimeChecks APPEND
            PROPERTY LABELS "CUDA" "Fortran")

        SET(MSVCRuntimeLibrary_BUILD_OPTIONS -DCMake_TEST_CUDA=${CMake_TEST_CUDA})
        ADD_TEST_MACRO(MSVCRuntimeLibrary)
        SET_PROPERTY(TEST MSVCRuntimeLibrary APPEND
            PROPERTY LABELS "CUDA")
        IF (CMAKE_Fortran_COMPILER)
            ADD_TEST_MACRO(MSVCRuntimeLibrary.Fortran)
            SET_PROPERTY(TEST MSVCRuntimeLibrary.Fortran APPEND PROPERTY LABELS "Fortran")
        ENDIF ()
    ENDIF ()
    IF (MSVC OR
        "${CMAKE_GENERATOR}" MATCHES "(MSYS|MinGW) Makefiles")
        ADD_TEST_MACRO(ModuleDefinition example_exe)
    ENDIF ()

    IF (CMAKE_C_COMPILER_ID MATCHES "Watcom" AND WIN32)
        ADD_TEST_MACRO(WatcomRuntimeLibrary)
    ENDIF ()

    ADD_TEST_MACRO(CheckCompilerRelatedVariables CheckCompilerRelatedVariables)

    IF ("${CMAKE_GENERATOR}" MATCHES "^Ninja$|Makefile|FASTBuild")
        ADD_TEST(MakeClean ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/MakeClean"
            "${CMake_BINARY_DIR}/Tests/MakeClean"
            ${build_generator_args}
            --build-project MakeClean
            --build-exe-dir "${CMake_BINARY_DIR}/MakeClean"
            --test-command check_clean
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/MakeClean")
    ENDIF ()

    IF (CMake_TEST_MFC)
        ADD_TEST(MFC ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/MFC"
            "${CMake_BINARY_DIR}/Tests/MFC"
            --build-two-config
            ${build_generator_args}
            --build-project mfc_driver
            --test-command ${CMAKE_CTEST_COMMAND}
            -C ${CTEST_CONFIGURATION_TYPE} -VV)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/MFC")
    ENDIF ()

    IF (MSVC AND NOT MSVC_VERSION LESS 1700
        AND (CMAKE_C_COMPILER_ARCHITECTURE_ID STREQUAL "ARM64")
    )
        ADD_TEST_MACRO(VSMARMASM VSMARMASM)
    ENDIF ()

    IF (MSVC AND NOT MSVC_VERSION LESS 1310
        AND (NOT CMAKE_C_COMPILER_ARCHITECTURE_ID STREQUAL "ARM64")
    )
        ADD_TEST_MACRO(VSMASM VSMASM)
    ENDIF ()

    IF (CMAKE_GENERATOR MATCHES "Visual Studio")
        IF (NOT MSVC60)
            ADD_TEST_MACRO(SBCS SBCS)
        ENDIF ()

        IF (NOT CMAKE_GENERATOR_TOOLSET STREQUAL "v90"
            AND NOT CMAKE_VS_PLATFORM_NAME STREQUAL "ARM64")
            ADD_TEST_MACRO(VSWindowsFormsResx VSWindowsFormsResx)
            ADD_TEST_MACRO(VSManagedCustomCommand)
        ENDIF ()

        ADD_TEST(VSExternalInclude ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/VSExternalInclude"
            "${CMake_BINARY_DIR}/Tests/VSExternalInclude"
            --build-two-config
            ${build_generator_args}
            --build-project VSExternalInclude
            --test-command VSExternalInclude)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/VSExternalInclude")

        ADD_TEST(VSMidl ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/VSMidl"
            "${CMake_BINARY_DIR}/Tests/VSMidl"
            --build-two-config
            ${build_generator_args}
            --build-project VSMidl
            --test-command VSMidl)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/VSMidl")

        IF (CMake_TEST_DEVENV)
            # The test (and tested property) works with .sln files, so it's skipped when:
            # * cmake --build is set up to use MSBuild, since the MSBuild invocation does not use the .sln file
            SET(_last_test "")
            FOREACH (config IN LISTS CMAKE_CONFIGURATION_TYPES)
                ADD_TEST(NAME VSExcludeFromDefaultBuild-${config} COMMAND ${CMAKE_CTEST_COMMAND}
                    --build-and-test
                    "${CMake_SOURCE_DIR}/Tests/VSExcludeFromDefaultBuild"
                    "${CMake_BINARY_DIR}/Tests/VSExcludeFromDefaultBuild"
                    --build-config ${config}
                    --build-two-config
                    --build-generator ${CMAKE_GENERATOR}
                    --build-makeprogram ${CMake_TEST_DEVENV}
                    --build-generator-platform "${CMAKE_GENERATOR_PLATFORM}"
                    --build-generator-toolset "${CMAKE_GENERATOR_TOOLSET}"
                    --build-project VSExcludeFromDefaultBuild
                    --build-target install
                    --test-command ${CMAKE_COMMAND}
                    -D "activeConfig=${config}"
                    -D "allConfigs=${CMAKE_CONFIGURATION_TYPES}"
                    -D "dir=${CMake_BINARY_DIR}/Tests/VSExcludeFromDefaultBuild"
                    -P "${CMake_SOURCE_DIR}/Tests/VSExcludeFromDefaultBuild/ResultTest.cmake")
                IF (_last_test)
                    SET_PROPERTY(TEST VSExcludeFromDefaultBuild-${config} PROPERTY DEPENDS ${_last_test})
                ENDIF ()
                SET(_last_test "VSExcludeFromDefaultBuild-${config}")
            ENDFOREACH ()
            UNSET(_last_test)
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/VSExcludeFromDefaultBuild")
        ENDIF ()

        ADD_TEST(NAME VSProjectInSubdir COMMAND ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/VSProjectInSubdir"
            "${CMake_BINARY_DIR}/Tests/VSProjectInSubdir"
            --build-two-config
            --build-generator ${CMAKE_GENERATOR}
            --build-generator-platform "${CMAKE_GENERATOR_PLATFORM}"
            --build-generator-toolset "${CMAKE_GENERATOR_TOOLSET}"
            --build-project VSProjectInSubdir
            --build-target test)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/VSProjectInSubdir")
    ENDIF ()

    GET_FILENAME_COMPONENT(ntver "[HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows NT\\CurrentVersion;CurrentVersion]" NAME)
    IF (WIN32 AND ntver VERSION_GREATER 6.1) # Windows >= 8.0
        MACRO(add_test_VSWinStorePhone name generator systemName systemVersion architecture)
            ADD_TEST(NAME VSWinStorePhone.${name} COMMAND ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/VSWinStorePhone"
                "${CMake_BINARY_DIR}/Tests/VSWinStorePhone/${name}"
                --build-generator "${generator}"
                --build-generator-platform "${architecture}"
                --build-project VSWinStorePhone
                --build-config $<CONFIGURATION>
                --build-options -DCMAKE_SYSTEM_NAME=${systemName}
                -DCMAKE_SYSTEM_VERSION=${systemVersion}
                --test-command
                ${CMAKE_CMAKE_COMMAND} -DAPP_PACKAGE_DIR="${CMake_BINARY_DIR}/Tests/VSWinStorePhone/${name}"
                -P "${CMake_SOURCE_DIR}/Tests/VSWinStorePhone/VerifyAppPackage.cmake"
            )
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/VSWinStorePhone/${name}")
        ENDMACRO()

        # FIXME(#26248): Update this test to work with newer VS and Win 10.0.
        # It previously ran with Visual Studio 12 2013 targeting Win 8.1.
        IF (FALSE AND CMAKE_GENERATOR MATCHES "Visual Studio")
            ADD_TEST(NAME VSXaml COMMAND ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/VSXaml"
                "${CMake_BINARY_DIR}/Tests/VSXaml"
                --build-generator "${CMAKE_GENERATOR}"
                --build-project VSXaml
                --build-config $<CONFIGURATION>
                --build-options -DCMAKE_SYSTEM_NAME=WindowsStore
                -DCMAKE_SYSTEM_VERSION=10.0
            )
        ENDIF ()

        IF (CMake_TEST_VSWinStorePhone_VS_2017 AND ws10_0)
            ADD_TEST_VSWINSTOREPHONE(vs15-store10_0-X86 "Visual Studio 15 2017" WindowsStore 10.0 Win32)
            ADD_TEST_VSWINSTOREPHONE(vs15-store10_0-ARM "Visual Studio 15 2017" WindowsStore 10.0 ARM)
            ADD_TEST_VSWINSTOREPHONE(vs15-store10_0-X64 "Visual Studio 15 2017" WindowsStore 10.0 x64)
            ADD_TEST_VSWINSTOREPHONE(vs15-store10_0-ARM64 "Visual Studio 15 2017" WindowsStore 10.0 ARM64)
        ENDIF ()
        IF (vs14 AND ws10_0)
            ADD_TEST_VSWINSTOREPHONE(vs14-store10_0-X86 "Visual Studio 14 2015" WindowsStore 10.0 Win32)
            ADD_TEST_VSWINSTOREPHONE(vs14-store10_0-ARM "Visual Studio 14 2015" WindowsStore 10.0 ARM)
            ADD_TEST_VSWINSTOREPHONE(vs14-store10_0-X64 "Visual Studio 14 2015" WindowsStore 10.0 x64)
        ENDIF ()
    ENDIF ()

    IF (CMAKE_GENERATOR MATCHES "Visual Studio" AND nasm)
        ADD_TEST_MACRO(VSNASM VSNASM)
    ENDIF ()

    IF (CMake_TEST_GreenHillsMULTI)
        MACRO(add_test_GhsMulti test_name test_dir bin_sub_dir build_opts)
            SEPARATE_ARGUMENTS(_ghs_build_opts UNIX_COMMAND ${build_opts})
            SEPARATE_ARGUMENTS(_ghs_toolset_extra UNIX_COMMAND ${ghs_toolset_extra})
            IF (${ARGC} GREATER 4)
                SET(_ghs_test_command --test-command ${ARGN})
            ENDIF ()
            IF (ghs_config_name STREQUAL "__default__")
                SET(_ghs_test_name "${test_name}")
            ELSE ()
                SET(_ghs_test_name "${ghs_config_name}.${test_name}")
            ENDIF ()
            ADD_TEST(NAME GhsMulti.${_ghs_test_name}
                COMMAND ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/GhsMulti/${test_dir}"
                "${CMake_BINARY_DIR}/Tests/GhsMulti/${ghs_config_name}/${test_dir}/${bin_sub_dir}"
                --build-generator "Green Hills MULTI"
                --build-project test
                --build-config $<CONFIGURATION>
                --build-options ${ghs_target_arch} ${ghs_toolset_name} ${ghs_toolset_root} ${ghs_target_platform}
                ${ghs_os_root} ${ghs_os_dir} ${ghs_bsp_name} ${_ghs_build_opts} ${_ghs_toolset_extra}
                ${_ghs_test_command}
            )
            UNSET(_ghs_build_opts)
            UNSET(_ghs_toolset_extra)
            UNSET(_ghs_test_command)
            UNSET(_ghs_test_name)
        ENDMACRO()
        MACRO(add_test_GhsMulti_rename_install test_name)
            ADD_TEST_GHSMULTI(${test_name} GhsMultiRenameInstall ${test_name}
                "-DCMAKE_INSTALL_PREFIX=. -DRUN_TEST=${test_name}" ${CMAKE_CMAKE_COMMAND} --build . --target INSTALL)
        ENDMACRO()
        #unset ghs config variables
        UNSET(ghs_config_name)
        UNSET(ghs_target_arch)
        UNSET(ghs_toolset_root)
        UNSET(ghs_toolset_name)
        UNSET(ghs_os_root)
        UNSET(ghs_os_dir)
        UNSET(ghs_target_platform)
        UNSET(ghs_bsp_name)
        UNSET(ghs_toolset_extra)
        IF (NOT CMake_TEST_GreenHillsMULTI_config)
            #if list of config settings not defined then just run once as default
            SET(CMake_TEST_GreenHillsMULTI_config "__default__")
        ENDIF ()
        FOREACH (ghs_file IN LISTS CMake_TEST_GreenHillsMULTI_config)
            # source GHS tools config file
            IF (NOT ghs_file STREQUAL "__default__")
                IF (IS_ABSOLUTE ${ghs_file})
                    INCLUDE(${ghs_file})
                ELSE ()
                    INCLUDE(${CMAKE_BINARY_DIR}/${ghs_file})
                ENDIF ()
            ENDIF ()
            IF (NOT ghs_config_name)
                SET(ghs_config_name "__default__")
            ENDIF ()
            # test integrity build
            IF (NOT ghs_skip_integrity AND (NOT ghs_target_platform OR ghs_target_platform MATCHES "integrity"))
                ADD_TEST_GHSMULTI(integrityDDInt GhsMultiIntegrity/GhsMultiIntegrityDDInt "" "")
                ADD_TEST_GHSMULTI(integrityMonolith GhsMultiIntegrity/GhsMultiIntegrityMonolith "" "")
                ADD_TEST_GHSMULTI(integrityDD GhsMultiIntegrity/GhsMultiIntegrityDD "" "")
            ENDIF ()
            ADD_TEST_GHSMULTI(duplicate_source_filenames GhsMultiDuplicateSourceFilenames "" "")
            ADD_TEST_GHSMULTI_RENAME_INSTALL(SINGLE_EXEC)
            ADD_TEST_GHSMULTI_RENAME_INSTALL(SINGLE_EXEC_RENAMED)
            ADD_TEST_GHSMULTI_RENAME_INSTALL(EXEC_AND_LIB)
            ADD_TEST_GHSMULTI(multiple_source_groups GhsMultiSrcGroups Default "")
            ADD_TEST_GHSMULTI(multiple_source_groups_folders GhsMultiSrcGroups PropFolders "-DTEST_PROP=ON")
            ADD_TEST_GHSMULTI(multiple_source_groups_all_folders GhsMultiSrcGroups AllFolders "-DCMAKE_GHS_NO_SOURCE_GROUP_FILE=ON")
            ADD_TEST_GHSMULTI(unsupported_targets GhsMultiUnsupportedTargets "" "")
            ADD_TEST_GHSMULTI(object_library GhsMultiObjectLibrary "" "")
            ADD_TEST_GHSMULTI(exclude GhsMultiExclude "" ""
                ${CMAKE_CMAKE_COMMAND} -P ${CMake_SOURCE_DIR}/Tests/GhsMulti/GhsMultiExclude/verify.cmake)
            ADD_TEST_GHSMULTI(interface GhsMultiInterface "" "")
            ADD_TEST_GHSMULTI(transitive_link_test GhsMultiLinkTest TransitiveLink "-DRUN_TEST=NO_FLAGS")
            ADD_TEST_GHSMULTI(flags_link_test GhsMultiLinkTest FlagsCheck "-DRUN_TEST=CHECK_FLAGS")
            ADD_TEST_GHSMULTI(sub_link_test GhsMultiLinkTestSub "" "")
            ADD_TEST_GHSMULTI(multiple_projects GhsMultiMultipleProjects "" ""
                ${CMAKE_CMAKE_COMMAND} -P ${CMake_SOURCE_DIR}/Tests/GhsMulti/GhsMultiMultipleProjects/verify.cmake)
            ADD_TEST_GHSMULTI(compiler_options_none GhsMultiCompilerOptions None "-DRUN_TEST=RELEASE_FLAGS -DRUN_TEST_BUILD_TYPE=\"\"")
            ADD_TEST_GHSMULTI(compiler_options_kernel GhsMultiCompilerOptions Kernel "-DRUN_TEST=KERNEL_FLAGS -DRUN_TEST_BUILD_TYPE=DEBUG")
            ADD_TEST_GHSMULTI(try_compile_copy GhsMultiCopyFile "" "")
            ADD_TEST_GHSMULTI(ghs_platform GhsMultiPlatform "" "")
            ADD_TEST_GHSMULTI(custom_target GhsMultiCustomTarget "" "")
            ADD_TEST_GHSMULTI(dep_order GhsMultiDepOrder "" "")
            ADD_TEST_GHSMULTI(external_project GhsMultiExternalProject "" "")
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/GhsMulti/${ghs_config_name}")
            #unset ghs config variables
            UNSET(ghs_config_name)
            UNSET(ghs_target_arch)
            UNSET(ghs_toolset_root)
            UNSET(ghs_toolset_name)
            UNSET(ghs_os_root)
            UNSET(ghs_os_dir)
            UNSET(ghs_target_platform)
            UNSET(ghs_bsp_name)
            UNSET(ghs_toolset_extra)
        ENDFOREACH ()
    ENDIF ()

    MACRO(add_test_VSAndroid name generator platform)
        ADD_TEST(NAME "VSAndroid.${name}.${platform}" COMMAND ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/VSAndroid"
            "${CMake_BINARY_DIR}/Tests/VSAndroid/${name}/${platform}"
            --build-generator "${generator}"
            --build-project VSAndroid
            --build-config $<CONFIGURATION>
            --build-options -DCMAKE_SYSTEM_NAME=Android "-A${platform}"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/VSAndroid/${name}")
    ENDMACRO()
    IF (tegra AND NOT "${CMake_SOURCE_DIR};${CMake_BINARY_DIR}" MATCHES " ")
        IF (vs14)
            ADD_TEST_VSANDROID(vs14 "Visual Studio 14 2015" "Tegra-Android")
        ENDIF ()
    ENDIF ()
    IF (vs14 AND CMake_TEST_ANDROID_VS14)
        ADD_TEST_VSANDROID(vs14 "Visual Studio 14 2015" "ARM")
    ENDIF ()
    IF (vs15 AND CMake_TEST_ANDROID_VS15)
        ADD_TEST_VSANDROID(vs15 "Visual Studio 15 2017" "ARM")
    ENDIF ()
    IF (vs16 AND CMake_TEST_ANDROID_VS16)
        ADD_TEST_VSANDROID(vs16 "Visual Studio 16 2019" "ARM")
    ENDIF ()
    IF (vs17 AND CMake_TEST_ANDROID_VS17)
        ADD_TEST_VSANDROID(vs17 "Visual Studio 17 2022" "ARM")
    ENDIF ()
    IF (vs18 AND CMake_TEST_ANDROID_VS18)
        ADD_TEST_VSANDROID(vs18 "Visual Studio 18 2026" "ARM")
    ENDIF ()

    IF (APPLE)
        IF (CMAKE_CXX_COMPILER_ID STREQUAL "GNU" OR "${CMAKE_CXX_COMPILER_ID}" MATCHES "Clang")
            SET(BundleTestInstallDir
                "${CMake_BINARY_DIR}/Tests/BundleTest/InstallDirectory")
            ADD_TEST(BundleTest ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/BundleTest"
                "${CMake_BINARY_DIR}/Tests/BundleTest"
                --build-two-config
                ${build_generator_args}
                --build-project BundleTest
                --build-target install
                #       --build-target package
                --build-options
                "-DCMAKE_INSTALL_PREFIX:PATH=${BundleTestInstallDir}"
                "-DCMake_SOURCE_DIR:PATH=${CMake_SOURCE_DIR}"
                --test-command
                ${BundleTestInstallDir}/Applications/SecondBundleExe.app/Contents/MacOS/SecondBundleExe)
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/BundleTest")

            ADD_TEST(NAME CFBundleTest COMMAND ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/CFBundleTest"
                "${CMake_BINARY_DIR}/Tests/CFBundleTest"
                --build-two-config
                ${build_generator_args}
                --build-project CFBundleTest
                --build-config $<CONFIGURATION>
                --test-command
                ${CMAKE_CMAKE_COMMAND} -DCTEST_CONFIGURATION_TYPE=$<CONFIGURATION>
                -Ddir=${CMake_BINARY_DIR}/Tests/CFBundleTest
                -Dgen=${CMAKE_GENERATOR}
                -P ${CMake_SOURCE_DIR}/Tests/CFBundleTest/VerifyResult.cmake)
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/CFBundleTest")
        ENDIF ()
    ENDIF ()

    IF (APPLE AND CTEST_TEST_CPACK)
        ADD_TEST(BundleGeneratorTest ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/BundleGeneratorTest"
            "${CMake_BINARY_DIR}/Tests/BundleGeneratorTest"
            --build-two-config
            ${build_generator_args}
            --build-project BundleGeneratorTest
            --build-target package
            --build-options
            "-DCMAKE_INSTALL_PREFIX:PATH=${CMake_BINARY_DIR}/Tests/BundleGeneratorTest/InstallDirectory"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/BundleGeneratorTest")
    ENDIF ()

    ADD_TEST(WarnUnusedCliUnused ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/WarnUnusedCliUnused"
        "${CMake_BINARY_DIR}/Tests/WarnUnusedCliUnused"
        ${build_generator_args}
        --build-project WarnUnusedCliUnused
        --build-options
        "-DUNUSED_CLI_VARIABLE=Unused")
    SET_TESTS_PROPERTIES(WarnUnusedCliUnused PROPERTIES
        PASS_REGULAR_EXPRESSION "CMake Warning:.*Manually-specified variables were not used by the project:.*  UNUSED_CLI_VARIABLE")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/WarnUnusedCliUnused")

    ADD_TEST(WarnUnusedCliUsed ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/VariableUsage"
        "${CMake_BINARY_DIR}/Tests/WarnUnusedCliUsed"
        ${build_generator_args}
        --build-noclean
        --build-project WarnUnusedCliUsed
        --build-options
        "-DUSED_VARIABLE=Usage proven")
    SET_TESTS_PROPERTIES(WarnUnusedCliUsed PROPERTIES
        PASS_REGULAR_EXPRESSION "Usage proven")
    SET_TESTS_PROPERTIES(WarnUnusedCliUsed PROPERTIES
        FAIL_REGULAR_EXPRESSION "CMake Warning: The variable, 'USED_VARIABLE'")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/WarnUnusedCliUsed")

    ADD_TEST(WarnUninitialized ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/VariableUsage"
        "${CMake_BINARY_DIR}/Tests/WarnUninitialized"
        ${build_generator_args}
        --build-noclean
        --build-project WarnUninitialized
        --build-options
        "--warn-uninitialized")
    SET_TESTS_PROPERTIES(WarnUninitialized PROPERTIES
        PASS_REGULAR_EXPRESSION "uninitialized variable 'USED_VARIABLE'")
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/WarnUninitialized")

    ADD_TEST(TestsWorkingDirectory
        ${CMAKE_CTEST_COMMAND} -C ${CTEST_CONFIGURATION_TYPE}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/TestsWorkingDirectory"
        "${CMake_BINARY_DIR}/Tests/TestsWorkingDirectory"
        ${build_generator_args}
        --build-project TestsWorkingDirectoryProj
        --build-exe-dir "${CMake_BINARY_DIR}/Tests/TestsWorkingDirectory"
        --test-command ${CMAKE_CTEST_COMMAND} -V -C ${CTEST_CONFIGURATION_TYPE}
    )
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/TestsWorkingDirectory")

    # Make sure CTest can handle a test with no newline in output.
    ADD_TEST(CTest.NoNewline
        ${CMAKE_CMAKE_COMMAND} -E echo_append "This line has no newline!")

    # A simple test for ctest in script mode
    CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestScriptMode/CTestTestScriptMode.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestScriptMode/CTestTestScriptMode.cmake" @ONLY)
    ADD_TEST(CTest.ScriptMode ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestScriptMode/CTestTestScriptMode.cmake"
    )

    # Test CTest Update with Subversion
    IF (NOT DEFINED CMake_TEST_CTestUpdate_SVN OR CMake_TEST_CTestUpdate_SVN)
        FIND_PACKAGE(Subversion QUIET)
        IF (Subversion_FOUND)
            GET_FILENAME_COMPONENT(_Subversion_BIN_DIR
                ${Subversion_SVN_EXECUTABLE} PATH)
            FIND_PROGRAM(Subversion_SVNADMIN_EXECUTABLE svnadmin
                HINTS ${_Subversion_BIN_DIR}
            )
            MARK_AS_ADVANCED(Subversion_SVNADMIN_EXECUTABLE)
            IF (NOT Subversion_SVNADMIN_EXECUTABLE)
                SET(Subversion_FOUND FALSE)
            ENDIF ()
        ENDIF ()
    ENDIF ()
    IF (NOT DEFINED CMake_TEST_CTestUpdate_SVN AND Subversion_FOUND)
        SET(CMake_TEST_CTestUpdate_SVN 1)
    ENDIF ()
    IF (CMake_TEST_CTestUpdate_SVN)
        IF (NOT Subversion_FOUND)
            MESSAGE(FATAL_ERROR "CMake_TEST_CTestUpdate_SVN enabled but Subversion is not found.")
        ENDIF ()
        SET(CTestUpdateSVN_DIR "CTest UpdateSVN")
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestUpdateSVN.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestUpdateSVN.cmake" @ONLY)
        ADD_TEST(CTest.UpdateSVN ${CMAKE_CMAKE_COMMAND}
            -P "${CMake_BINARY_DIR}/Tests/CTestUpdateSVN.cmake"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${CTestUpdateSVN_DIR}")
    ENDIF ()

    # Test CTest Update with CVS
    IF (NOT DEFINED CMake_TEST_CTestUpdate_CVS OR CMake_TEST_CTestUpdate_CVS)
        FIND_PROGRAM(CVS_EXECUTABLE NAMES cvs)
        MARK_AS_ADVANCED(CVS_EXECUTABLE)
    ENDIF ()
    IF (NOT DEFINED CMake_TEST_CTestUpdate_CVS AND CVS_EXECUTABLE
        AND (UNIX OR NOT "${CVS_EXECUTABLE}" MATCHES "cygwin"))
        SET(CMake_TEST_CTestUpdate_CVS 1)
    ENDIF ()
    IF (CMake_TEST_CTestUpdate_CVS)
        IF (NOT CVS_EXECUTABLE)
            MESSAGE(FATAL_ERROR "CMake_TEST_CTestUpdate_CVS enabled but CVS_EXECUTABLE is not found.")
        ENDIF ()
        SET(CTestUpdateCVS_DIR "CTest UpdateCVS")
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestUpdateCVS.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestUpdateCVS.cmake" @ONLY)
        ADD_TEST(CTest.UpdateCVS ${CMAKE_CMAKE_COMMAND}
            -P "${CMake_BINARY_DIR}/Tests/CTestUpdateCVS.cmake"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${CTestUpdateCVS_DIR}")
    ENDIF ()

    # Test CTest Update with BZR
    IF (CMake_TEST_CTestUpdate_BZR)
        IF (TEST_HOME)
            FILE(MAKE_DIRECTORY "${TEST_HOME}/.bazaar")
        ENDIF ()
        FIND_PROGRAM(BZR_EXECUTABLE NAMES bzr)
        MARK_AS_ADVANCED(BZR_EXECUTABLE)
        IF (NOT BZR_EXECUTABLE)
            MESSAGE(FATAL_ERROR "CMake_TEST_CTestUpdate_BZR enabled but BZR_EXECUTABLE is not found.")
        ENDIF ()
        SET(CTestUpdateBZR_DIR "CTest UpdateBZR")
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestUpdateBZR.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestUpdateBZR.cmake" @ONLY)
        ADD_TEST(CTest.UpdateBZR ${CMAKE_CMAKE_COMMAND}
            -P "${CMake_BINARY_DIR}/Tests/CTestUpdateBZR.cmake"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${CTestUpdateBZR_DIR}")
        SET(CTestUpdateBZR_DIR "CTest UpdateBZR_CLocale")
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestUpdateBZR.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestUpdateBZR_CLocale.cmake" @ONLY)
        ADD_TEST(CTest.UpdateBZR.CLocale ${CMAKE_CMAKE_COMMAND}
            -P "${CMake_BINARY_DIR}/Tests/CTestUpdateBZR_CLocale.cmake"
        )
        SET_TESTS_PROPERTIES(CTest.UpdateBZR.CLocale PROPERTIES ENVIRONMENT LC_ALL=C)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${CTestUpdateBZR_DIR}")
    ENDIF ()

    # Test CTest Update with GIT
    IF (NOT DEFINED CMake_TEST_CTestUpdate_GIT AND GIT_EXECUTABLE
        AND (UNIX OR NOT "${GIT_EXECUTABLE}" MATCHES "cygwin"))
        SET(CMake_TEST_CTestUpdate_GIT 1)
    ENDIF ()
    IF (CMake_TEST_CTestUpdate_GIT)
        IF (NOT GIT_EXECUTABLE)
            MESSAGE(FATAL_ERROR "CMake_TEST_CTestUpdate_GIT enabled but GIT_EXECUTABLE is not found.")
        ENDIF ()
        SET(CTestUpdateGIT_DIR "CTest UpdateGIT")
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestUpdateGIT.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestUpdateGIT.cmake" @ONLY)
        ADD_TEST(CTest.UpdateGIT ${CMAKE_CMAKE_COMMAND}
            -P "${CMake_BINARY_DIR}/Tests/CTestUpdateGIT.cmake"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${CTestUpdateGIT_DIR}")
        SET_PROPERTY(TEST CTest.UpdateGIT PROPERTY ENVIRONMENT GIT_ALLOW_PROTOCOL=file)
    ENDIF ()

    # Test CTest Update with HG
    IF (NOT DEFINED CMake_TEST_CTestUpdate_HG OR CMake_TEST_CTestUpdate_HG)
        FIND_PROGRAM(HG_EXECUTABLE NAMES hg)
        MARK_AS_ADVANCED(HG_EXECUTABLE)
    ENDIF ()
    IF (NOT DEFINED CMake_TEST_CTestUpdate_HG AND HG_EXECUTABLE
        AND (UNIX OR NOT "${HG_EXECUTABLE}" MATCHES "cygwin"))
        EXECUTE_PROCESS(COMMAND "${HG_EXECUTABLE}" --version OUTPUT_QUIET ERROR_QUIET RESULT_VARIABLE HG_RV)
        IF (HG_RV EQUAL 0)
            SET(CMake_TEST_CTestUpdate_HG 1)
        ENDIF ()
    ENDIF ()
    IF (CMake_TEST_CTestUpdate_HG)
        IF (NOT HG_EXECUTABLE)
            MESSAGE(FATAL_ERROR "CMake_TEST_CTestUpdate_HG enabled but HG_EXECUTABLE is not found.")
        ENDIF ()
        SET(CTestUpdateHG_DIR "CTest UpdateHG")
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestUpdateHG.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestUpdateHG.cmake" @ONLY)
        ADD_TEST(CTest.UpdateHG ${CMAKE_CMAKE_COMMAND}
            -P "${CMake_BINARY_DIR}/Tests/CTestUpdateHG.cmake"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${CTestUpdateHG_DIR}")
    ENDIF ()

    # Test CTest Update with P4
    IF (CMake_TEST_CTestUpdate_P4)
        FIND_PROGRAM(P4_EXECUTABLE NAMES p4)
        FIND_PROGRAM(P4D_EXECUTABLE NAMES p4d)
        MARK_AS_ADVANCED(P4_EXECUTABLE P4D_EXECUTABLE)
        IF (NOT P4_EXECUTABLE OR NOT P4D_EXECUTABLE)
            MESSAGE(FATAL_ERROR "CMake_TEST_CTestUpdate_HG enabled but P4_EXECUTABLE and P4D_EXECUTABLE are not both not found.")
        ENDIF ()
        SET(CTestUpdateP4_DIR "CTest UpdateP4")
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestUpdateP4.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestUpdateP4.cmake" @ONLY)
        ADD_TEST(CTest.UpdateP4 ${CMAKE_CMAKE_COMMAND}
            -P "${CMake_BINARY_DIR}/Tests/CTestUpdateP4.cmake"
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/${CTestUpdateP4_DIR}")
    ENDIF ()

    IF (NOT CMake_TEST_NO_NETWORK)
        CONFIGURE_FILE(
            "${CMake_SOURCE_DIR}/Tests/CTestTestUpload/test.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestTestUpload/test.cmake"
            @ONLY ESCAPE_QUOTES)
        ADD_TEST(CTestTestUpload ${CMAKE_CTEST_COMMAND}
            -S "${CMake_BINARY_DIR}/Tests/CTestTestUpload/test.cmake" -V
            --output-log "${CMake_BINARY_DIR}/Tests/CTestTestUpload/testOut.log"
        )
        SET_TESTS_PROPERTIES(CTestTestUpload PROPERTIES
            PASS_REGULAR_EXPRESSION "Upload\\.xml")
    ENDIF ()

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestCoverageCollectGCOV/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestCoverageCollectGCOV/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestCoverageCollectGCOV ${CMAKE_CTEST_COMMAND}
        -C ${CTEST_CONFIGURATION_TYPE}
        -S "${CMake_BINARY_DIR}/Tests/CTestCoverageCollectGCOV/test.cmake" -VV
        --output-log "${CMake_BINARY_DIR}/Tests/CTestCoverageCollectGCOV/testOut.log"
    )

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestEmptyBinaryDirectory/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestEmptyBinaryDirectory/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestEmptyBinaryDirectory ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestEmptyBinaryDirectory/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestEmptyBinaryDirectory/testOut.log"
    )
    SET_TESTS_PROPERTIES(CTestTestEmptyBinaryDirectory PROPERTIES
        PASS_REGULAR_EXPRESSION "TEST_SUCCESS")

    # test coverage for mumps
    # create a MumpsCoverage dir in the binary tree under Testing to
    # avoid the .NoDartCoverage files in the cmake testing tree
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/MumpsCoverage/DartConfiguration.tcl.in"
        "${CMake_BINARY_DIR}/Testing/MumpsCoverage/DartConfiguration.tcl")
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/MumpsCoverage/gtm_coverage.mcov.in"
        "${CMake_BINARY_DIR}/Testing/MumpsCoverage/gtm_coverage.mcov")
    FILE(REMOVE_RECURSE "${CMake_BINARY_DIR}/Testing/MumpsCoverage/VistA-FOIA")
    FILE(COPY "${CMake_SOURCE_DIR}/Tests/MumpsCoverage/VistA-FOIA"
        DESTINATION "${CMake_BINARY_DIR}/Testing/MumpsCoverage")
    ADD_TEST(NAME CTestGTMCoverage
        COMMAND ${CMAKE_CMAKE_COMMAND} -E chdir
        ${CMake_BINARY_DIR}/Testing/MumpsCoverage
        $<TARGET_FILE:ctest> -T Coverage --debug)
    SET_TESTS_PROPERTIES(CTestGTMCoverage PROPERTIES
        PASS_REGULAR_EXPRESSION
        "Process file.*ZZCOVTST.m.*Total LOC:.*32.*Percentage Coverage: 81.25*"
        ENVIRONMENT COVFILE=)

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/MumpsCoverage/DartConfiguration.cache.tcl.in"
        "${CMake_BINARY_DIR}/Testing/MumpsCacheCoverage/DartConfiguration.tcl")
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/MumpsCoverage/cache_coverage.cmcov.in"
        "${CMake_BINARY_DIR}/Testing/MumpsCacheCoverage/cache_coverage.cmcov")
    FILE(REMOVE_RECURSE "${CMake_BINARY_DIR}/Testing/MumpsCacheCoverage/VistA-FOIA")
    FILE(COPY "${CMake_SOURCE_DIR}/Tests/MumpsCoverage/VistA-FOIA"
        DESTINATION "${CMake_BINARY_DIR}/Testing/MumpsCacheCoverage")
    ADD_TEST(NAME CTestCacheCoverage
        COMMAND ${CMAKE_CMAKE_COMMAND} -E chdir
        ${CMake_BINARY_DIR}/Testing/MumpsCacheCoverage
        $<TARGET_FILE:ctest> -T Coverage --debug)
    SET_TESTS_PROPERTIES(CTestCacheCoverage PROPERTIES
        PASS_REGULAR_EXPRESSION
        "Process file.*ZZCOVTST.m.*Total LOC:.*32.*Percentage Coverage: 87.50.*"
        ENVIRONMENT COVFILE=)

    # Adding a test case for Python Coverage
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/PythonCoverage/coverage.xml.in"
        "${CMake_BINARY_DIR}/Testing/PythonCoverage/coverage.xml")
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/PythonCoverage/DartConfiguration.tcl.in"
        "${CMake_BINARY_DIR}/Testing/PythonCoverage/DartConfiguration.tcl")
    FILE(COPY "${CMake_SOURCE_DIR}/Tests/PythonCoverage/coveragetest"
        DESTINATION "${CMake_BINARY_DIR}/Testing/PythonCoverage")
    ADD_TEST(NAME CTestPythonCoverage
        COMMAND ${CMAKE_CMAKE_COMMAND} -E chdir
        ${CMake_BINARY_DIR}/Testing/PythonCoverage
        $<TARGET_FILE:ctest> -T Coverage --debug)
    SET_TESTS_PROPERTIES(CTestPythonCoverage PROPERTIES
        PASS_REGULAR_EXPRESSION
        "Process file.*foo.py.*Total LOC:.*13.*Percentage Coverage: 84.62.*"
        ENVIRONMENT COVFILE=)

    # Adding a test case for non-python Cobertura Coverage
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CoberturaCoverage/DartConfiguration.tcl.in"
        "${CMake_BINARY_DIR}/Testing/CoberturaCoverage/DartConfiguration.tcl")
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CoberturaCoverage/coverage.xml.in"
        "${CMake_BINARY_DIR}/Testing/CoberturaCoverage/coverage.xml")
    FILE(COPY "${CMake_SOURCE_DIR}/Tests/CoberturaCoverage/src"
        DESTINATION "${CMake_BINARY_DIR}/Testing/CoberturaCoverage")
    ADD_TEST(NAME CTestCoberturaCoverage
        COMMAND ${CMAKE_CMAKE_COMMAND} -E chdir
        ${CMake_BINARY_DIR}/Testing/CoberturaCoverage
        $<TARGET_FILE:ctest> -T Coverage --debug)
    SET_TESTS_PROPERTIES(CTestCoberturaCoverage PROPERTIES
        PASS_REGULAR_EXPRESSION
        "Process file.*CoverageTest.java.*Total LOC:.*18.*Percentage Coverage: 72.22.*"
        ENVIRONMENT COBERTURADIR=${CMake_BINARY_DIR}/Testing/CoberturaCoverage
        ENVIRONMENT COVFILE=)


    # Adding a test case for JaCoCo Coverage
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/JacocoCoverage/DartConfiguration.tcl.in"
        "${CMake_BINARY_DIR}/Testing/JacocoCoverage/DartConfiguration.tcl")
    FILE(COPY "${CMake_SOURCE_DIR}/Tests/JacocoCoverage/Coverage"
        DESTINATION "${CMake_BINARY_DIR}/Testing/JacocoCoverage")
    CONFIGURE_FILE("${CMake_BINARY_DIR}/Testing/JacocoCoverage/Coverage/target/site/jacoco.xml.in"
        "${CMake_BINARY_DIR}/Testing/JacocoCoverage/Coverage/target/site/jacoco.xml")
    ADD_TEST(NAME CTestJacocoCoverage
        COMMAND ${CMAKE_CMAKE_COMMAND} -E chdir
        ${CMake_BINARY_DIR}/Testing/JacocoCoverage
        $<TARGET_FILE:ctest> -T Coverage --debug)
    SET_TESTS_PROPERTIES(CTestJacocoCoverage PROPERTIES
        PASS_REGULAR_EXPRESSION
        "Process file.*CoverageTest.java.*Total LOC:.*17.*Percentage Coverage: 76.47*"
        ENVIRONMENT COVFILE=)

    # Adding a test case for Javascript Coverage
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/JavascriptCoverage/DartConfiguration.tcl.in"
        "${CMake_BINARY_DIR}/Testing/JavascriptCoverage/DartConfiguration.tcl")
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/JavascriptCoverage/output.json.in"
        "${CMake_BINARY_DIR}/Testing/JavascriptCoverage/output.json")
    FILE(COPY "${CMake_SOURCE_DIR}/Tests/JavascriptCoverage/"
        DESTINATION "${CMake_BINARY_DIR}/Testing/JavascriptCoverage"
        FILES_MATCHING PATTERN "*.js")
    ADD_TEST(NAME CTestJavascriptCoverage
        COMMAND ${CMAKE_CMAKE_COMMAND} -E chdir
        ${CMake_BINARY_DIR}/Testing/JavascriptCoverage
        $<TARGET_FILE:ctest> -T Coverage --debug)
    SET_TESTS_PROPERTIES(CTestJavascriptCoverage PROPERTIES
        PASS_REGULAR_EXPRESSION
        "Process file.*test3.js.*Total LOC:.*49.*Percentage Coverage: 79.59*"
        ENVIRONMENT COVFILE=)

    # test coverage for Delphi-code-Coverage
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/DelphiCoverage/DartConfiguration.tcl.in"
        "${CMake_BINARY_DIR}/Testing/DelphiCoverage/DartConfiguration.tcl")
    FILE(COPY "${CMake_SOURCE_DIR}/Tests/DelphiCoverage/src"
        DESTINATION "${CMake_BINARY_DIR}/Testing/DelphiCoverage")
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/DelphiCoverage/UTCovTest(UTCovTest.pas).html.in"
        "${CMake_BINARY_DIR}/Testing/DelphiCoverage/UTCovTest(UTCovTest.pas).html")
    ADD_TEST(NAME CTestDelphiCoverage
        COMMAND ${CMAKE_CMAKE_COMMAND} -E chdir
        ${CMake_BINARY_DIR}/Testing/DelphiCoverage
        $<TARGET_FILE:ctest> -T Coverage --debug)
    SET_TESTS_PROPERTIES(CTestDelphiCoverage PROPERTIES
        PASS_REGULAR_EXPRESSION
        "Process file.*UTCovTest.pas.*Total LOC:.*20.*Percentage Coverage: 95.*"
        ENVIRONMENT COVFILE=)

    FUNCTION(add_config_tests cfg)
        SET(base "${CMake_BINARY_DIR}/Tests/CTestConfig")

        # Test -S script with a -C config arg to ctest:
        CONFIGURE_FILE(
            "${CMake_SOURCE_DIR}/Tests/CTestConfig/script.cmake.in"
            "${base}/${cfg}-script.cmake"
            @ONLY ESCAPE_QUOTES)
        ADD_TEST(CTestConfig.Script.${cfg} ${CMAKE_CTEST_COMMAND}
            -C ${cfg}
            -S "${base}/${cfg}-script.cmake" -VV
            --output-log "${base}/${cfg}-script.log"
        )

        # Test -D dashboard with a -C config arg to ctest.
        # (Actual commands inside a cmake -P script because we need to be able to set
        #  the working directory reliably...)
        CONFIGURE_FILE(
            "${CMake_SOURCE_DIR}/Tests/CTestConfig/dashboard.cmake.in"
            "${base}/${cfg}-dashboard.cmake"
            @ONLY ESCAPE_QUOTES)
        ADD_TEST(CTestConfig.Dashboard.${cfg} ${CMAKE_CMAKE_COMMAND}
            -P "${base}/${cfg}-dashboard.cmake" -VV
        )
    ENDFUNCTION()

    ADD_CONFIG_TESTS(Debug)
    ADD_CONFIG_TESTS(MinSizeRel)
    ADD_CONFIG_TESTS(Release)
    ADD_CONFIG_TESTS(RelWithDebInfo)

    # Test -S script with some -D variable definition args to ctest:
    ADD_TEST(CTestConfig.ScriptWithArgs ${CMAKE_CTEST_COMMAND}
        -C "Release"
        -D arg1=this
        -D arg2=that
        -D "arg3=the other"
        "-Darg4=this is the fourth"
        -Darg5=the_fifth
        -Darg6:STRING=value-with-type
        -S "${CMake_SOURCE_DIR}/Tests/CTestConfig/ScriptWithArgs.cmake" -VV
        --output-log "${CMake_BINARY_DIR}/Tests/CTestConfig/ScriptWithArgs.log"
    )

    ADD_TEST_MACRO(CMakeCommands.add_compile_definitions add_compile_definitions)
    ADD_TEST_MACRO(CMakeCommands.add_compile_options add_compile_options)
    ADD_TEST_MACRO(CMakeCommands.target_link_libraries target_link_libraries)
    ADD_TEST_MACRO(CMakeCommands.target_include_directories target_include_directories)
    ADD_TEST_MACRO(CMakeCommands.target_compile_definitions target_compile_definitions)
    ADD_TEST_MACRO(CMakeCommands.target_compile_options target_compile_options)
    ADD_TEST_MACRO(CMakeCommands.target_sources target_sources)

    ADD_TEST_MACRO(CMakeCommands.add_link_options)
    ADD_TEST_MACRO(CMakeCommands.target_link_options)
    ADD_TEST_MACRO(CMakeCommands.link_directories)
    ADD_TEST_MACRO(CMakeCommands.target_link_directories)

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestCrash/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestCrash/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestCrash ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestCrash/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestCrash/testOutput.log"
    )
    # With Watcom and OrangeC the SEGFAULT is not found, it just fails
    IF (CMAKE_GENERATOR MATCHES "Watcom WMake" OR CMAKE_C_COMPILER_ID STREQUAL "OrangeC")
        SET_TESTS_PROPERTIES(CTestTestCrash PROPERTIES
            PASS_REGULAR_EXPRESSION "Failed")
    ELSE ()
        SET_TESTS_PROPERTIES(CTestTestCrash PROPERTIES
            PASS_REGULAR_EXPRESSION "(Illegal|SegFault|Subprocess aborted|SIGTRAP)")
    ENDIF ()

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestBadExe/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestBadExe/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestBadExe ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestBadExe/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestBadExe/testOutput.log"
    )
    SET(CTestTestBadExe_REGEX "BAD_COMMAND")
    # some cygwin can not be made to produce a BAD_COMMAND error
    # the best we can get from it is a failed test
    IF (CYGWIN)
        SET(CTestTestBadExe_REGEX "(\\*\\*\\*Failed)|BAD_COMMAND")
    ENDIF ()
    SET_TESTS_PROPERTIES(CTestTestBadExe PROPERTIES
        PASS_REGULAR_EXPRESSION "${CTestTestBadExe_REGEX}")

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestBadGenerator/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestBadGenerator/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestBadGenerator ${CMAKE_CTEST_COMMAND}
        -C "\${CTestTest_CONFIG}"
        -S "${CMake_BINARY_DIR}/Tests/CTestTestBadGenerator/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestBadGenerator/testOutput.log"
    )
    SET_PROPERTY(TEST CTestTestBadGenerator PROPERTY
        PASS_REGULAR_EXPRESSION "could not create generator named \"Bad Generator\"")

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestParallel/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestParallel/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestParallel ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestParallel/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestParallel/testOutput.log"
    )

    CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestTestVerboseOutput/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestVerboseOutput/test.cmake" @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestVerboseOutput ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestVerboseOutput/test.cmake" -VV
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestVerboseOutput/testOutput.log"
        -C "\${CTestTest_CONFIG}"
    )
    SET_PROPERTY(TEST CTestTestVerboseOutput PROPERTY PASS_REGULAR_EXPRESSION
        "Test command:.*Working Directory:.*Environment variables:.*foo=bar.*this=that"
    )

    ADD_TEST_MACRO(CTestTestSerialInDepends ${CMAKE_CTEST_COMMAND} -j 4
        --output-on-failure -C "\${CTestTest_CONFIG}")

    ADD_TEST_MACRO(CTestTestMissingDependsExe ${CMAKE_CTEST_COMMAND}
        --output-on-failure -C "\${CTestTest_CONFIG}")
    SET_TESTS_PROPERTIES(CTestTestMissingDependsExe PROPERTIES
        PASS_REGULAR_EXPRESSION "\\*\\*\\*Not Run"
    )

    IF (NOT BORLAND)
        ADD_TEST_MACRO(CTestLimitDashJ ${CMAKE_CTEST_COMMAND} -j 4
            --output-on-failure -C "\${CTestTest_CONFIG}")
    ENDIF ()

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestLabelRegExp/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestLabelRegExp/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(NAME CTestTestLabelRegExp
        COMMAND ${CMAKE_CMAKE_COMMAND}
        -DSOURCE_DIR=${CMAKE_SOURCE_DIR}/Tests/CTestTestLabelRegExp
        -P ${CMAKE_BINARY_DIR}/Tests/CTestTestLabelRegExp/test.cmake
        WORKING_DIRECTORY ${CMAKE_BINARY_DIR}/Tests/CTestTestLabelRegExp
    )

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestScheduler/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestScheduler/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestScheduler ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestScheduler/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestScheduler/testOutput.log"
    )
    SET_TESTS_PROPERTIES(CTestTestScheduler PROPERTIES
        PASS_REGULAR_EXPRESSION "Start 1.*Start 2.*Start 3.*Start 4.*Start 4.*Start 3.*Start 2.*Start 1"
        RESOURCE_LOCK "CostData")

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestCostSerial/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestCostSerial/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestCostSerial ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestCostSerial/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestCostSerial/testOutput.log"
    )
    SET_TESTS_PROPERTIES(CTestTestCostSerial PROPERTIES
        PASS_REGULAR_EXPRESSION "Start 2.*Start 3.*Start 1.*Start 2.*Start 3.*Start 1"
        RESOURCE_LOCK "CostData")

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestStopTime/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestStopTime/test.cmake"
        @ONLY ESCAPE_QUOTES)
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestStopTime/GetDate.cmake"
        "${CMake_BINARY_DIR}/Tests/CTestTestStopTime/GetDate.cmake"
        COPYONLY)
    ADD_TEST(CTestTestStopTime ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestStopTime/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestStopTime/testOutput.log"
    )
    SET_TESTS_PROPERTIES(CTestTestStopTime PROPERTIES
        PASS_REGULAR_EXPRESSION "The stop time has been passed")

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestSubdir/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestSubdir/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestSubdir ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestSubdir/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestSubdir/testOutput.log"
    )
    #make sure all 3 subdirs were added
    SET_TESTS_PROPERTIES(CTestTestSubdir PROPERTIES
        PASS_REGULAR_EXPRESSION "0 tests failed out of 3")

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestDepends/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestDepends/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestDepends ${CMAKE_CTEST_COMMAND}
        -C "\${CTestTest_CONFIG}"
        -S "${CMake_BINARY_DIR}/Tests/CTestTestDepends/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestDepends/testOutput.log"
    )

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestCycle/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestCycle/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestCycle ${CMAKE_CTEST_COMMAND}
        -C "\${CTestTest_CONFIG}"
        -S "${CMake_BINARY_DIR}/Tests/CTestTestCycle/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestCycle/testOutput.log"
    )
    SET_TESTS_PROPERTIES(CTestTestCycle PROPERTIES
        PASS_REGULAR_EXPRESSION "a cycle exists in the test dependency graph")

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestRunScript/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestRunScript/test.cmake"
        @ONLY ESCAPE_QUOTES)
    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestRunScript/hello.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestRunScript/hello.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestRunScript ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestRunScript/test.cmake" -V
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestRunScript/testOutput.log"
    )

    ADD_TEST(CTestTestShowOnly ${CMAKE_CTEST_COMMAND} -N)

    CONFIGURE_FILE(
        "${CMake_SOURCE_DIR}/Tests/CTestTestFdSetSize/test.cmake.in"
        "${CMake_BINARY_DIR}/Tests/CTestTestFdSetSize/test.cmake"
        @ONLY ESCAPE_QUOTES)
    ADD_TEST(CTestTestFdSetSize ${CMAKE_CTEST_COMMAND}
        -S "${CMake_BINARY_DIR}/Tests/CTestTestFdSetSize/test.cmake" -j20 -V --timeout 120
        --output-log "${CMake_BINARY_DIR}/Tests/CTestTestFdSetSize/testOutput.log"
    )

    IF (CMAKE_TESTS_CDASH_SERVER)
        SET(regex "^([^:]+)://([^/]+)(.*)$")

        IF ("${CMAKE_TESTS_CDASH_SERVER}" MATCHES "${regex}")
            SET(protocol "${CMAKE_MATCH_1}")
            SET(server "${CMAKE_MATCH_2}")
            SET(path "${CMAKE_MATCH_3}")
        ELSE ()
            SET(protocol "http")
            SET(server "open.cdash.org")
            SET(path "")
            MESSAGE("warning: CMAKE_TESTS_CDASH_SERVER does not match expected regex...")
            MESSAGE("         ...using default url='${protocol}://${server}${path}' for CTestTest[23]")
        ENDIF ()
    ENDIF ()


    IF (CTEST_TEST_CTEST AND CMAKE_RUN_LONG_TESTS AND CMAKE_TESTS_CDASH_SERVER)
        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestTest/test.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestTest/test.cmake" @ONLY ESCAPE_QUOTES)
        ADD_TEST(CTestTest ${CMAKE_CTEST_COMMAND}
            -S "${CMake_BINARY_DIR}/Tests/CTestTest/test.cmake" -V
            --output-log "${CMake_BINARY_DIR}/Tests/CTestTest/testOutput.log"
        )

        IF (NOT CMake_TEST_EXTERNAL_CMAKE)
            CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestTest2/test.cmake.in"
                "${CMake_BINARY_DIR}/Tests/CTestTest2/test.cmake" @ONLY ESCAPE_QUOTES)
            ADD_TEST(NAME CTestTest2 COMMAND ${CMAKE_CTEST_COMMAND} -C $<CONFIG>
                -S "${CMake_BINARY_DIR}/Tests/CTestTest2/test.cmake" -V
                --output-log "${CMake_BINARY_DIR}/Tests/CTestTest2/testOutput.log"
            )
        ENDIF ()

        IF ("${CMAKE_GENERATOR}" MATCHES "Makefiles|Ninja|FASTBuild")
            CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestTestLaunchers/test.cmake.in"
                "${CMake_BINARY_DIR}/Tests/CTestTestLaunchers/test.cmake" @ONLY ESCAPE_QUOTES)
            ADD_TEST(CTestTestLaunchers ${CMAKE_CTEST_COMMAND}
                -S "${CMake_BINARY_DIR}/Tests/CTestTestLaunchers/test.cmake" -V
                --output-log "${CMake_BINARY_DIR}/Tests/CTestTestLaunchers/testOutput.log"
            )
            SET_TESTS_PROPERTIES(CTestTestLaunchers PROPERTIES
                PASS_REGULAR_EXPRESSION "CTEST_TEST_LAUNCHER_SUCCESS")
        ENDIF ()

        CONFIGURE_FILE("${CMake_SOURCE_DIR}/Tests/CTestTestChecksum/test.cmake.in"
            "${CMake_BINARY_DIR}/Tests/CTestTestChecksum/test.cmake" @ONLY
            ESCAPE_QUOTES)
        ADD_TEST(CTestTestChecksum ${CMAKE_CTEST_COMMAND}
            -S "${CMake_BINARY_DIR}/Tests/CTestTestChecksum/test.cmake" -V
            --output-log
            "${CMake_BINARY_DIR}/Tests/CTestTestChecksum/testOutput.log"
        )
        SET_TESTS_PROPERTIES(CTestTestChecksum PROPERTIES PASS_REGULAR_EXPRESSION
            "md5 mismatch")

        # these tests take a long time, make sure they have it
        # if timeouts have not already been set
        GET_TEST_PROPERTY(CTestTest TIMEOUT PREVIOUS_TIMEOUT)
        IF ("${PREVIOUS_TIMEOUT}" MATCHES NOTFOUND)
            SET_TESTS_PROPERTIES(CTestTest
                PROPERTIES TIMEOUT ${CMAKE_LONG_TEST_TIMEOUT})
        ENDIF ()

        IF (NOT CMake_TEST_EXTERNAL_CMAKE)
            GET_TEST_PROPERTY(CTestTest2 TIMEOUT PREVIOUS_TIMEOUT)
            IF ("${PREVIOUS_TIMEOUT}" MATCHES NOTFOUND)
                SET_TESTS_PROPERTIES(CTestTest2
                    PROPERTIES TIMEOUT ${CMAKE_LONG_TEST_TIMEOUT})
            ENDIF ()
        ENDIF ()
    ENDIF ()

    IF (NOT DEFINED CMake_TEST_BOOTSTRAP)
        IF (CMAKE_RUN_LONG_TESTS
            AND NOT CMAKE_SKIP_BOOTSTRAP_TEST
            AND NOT CMake_TEST_EXTERNAL_CMAKE
            AND NOT CMAKE_GENERATOR MATCHES "Xcode"
            AND NOT EXISTS "${CMake_BINARY_DIR}/CMakeLists.txt"
        )
            SET(CMake_TEST_BOOTSTRAP 1)
        ELSE ()
            SET(CMake_TEST_BOOTSTRAP 0)
        ENDIF ()
    ENDIF ()
    SET(bootstrap "")
    IF (CMake_TEST_BOOTSTRAP)
        IF (UNIX)
            SET(bootstrap ${CMake_SOURCE_DIR}/bootstrap)
        ELSEIF (MSYS)
            CONFIGURE_FILE(${CMAKE_CURRENT_SOURCE_DIR}/bootstrap.bat.in
                ${CMAKE_CURRENT_BINARY_DIR}/bootstrap.bat @ONLY)
            SET(bootstrap ${CMAKE_CURRENT_BINARY_DIR}/bootstrap.bat)
        ENDIF ()
    ENDIF ()
    IF (bootstrap)
        ADD_TEST(NAME BootstrapTest
            COMMAND ${CMAKE_CMAKE_COMMAND}
            -D "bootstrap=${bootstrap}"
            -D "bin_dir=${CMake_BINARY_DIR}/Tests/BootstrapTest"
            -D "generator=${CMAKE_GENERATOR}"
            -P ${CMAKE_CURRENT_SOURCE_DIR}/BootstrapTest.cmake
        )
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/BootstrapTest")
        # This test will use all processors.
        SET_PROPERTY(TEST BootstrapTest PROPERTY RUN_SERIAL 1)
        # This test may take a long time.
        IF (NOT DEFINED CMake_TEST_BOOTSTRAP_TIMEOUT)
            SET(CMake_TEST_BOOTSTRAP_TIMEOUT 5400)
        ENDIF ()
        SET_PROPERTY(TEST BootstrapTest PROPERTY TIMEOUT "${CMake_TEST_BOOTSTRAP_TIMEOUT}")
    ENDIF ()

    IF (CMAKE_Fortran_COMPILER)
        ADD_TEST(Fortran ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/Fortran"
            "${CMake_BINARY_DIR}/Tests/Fortran"
            ${build_generator_args}
            --build-project testf
            --build-two-config
            --test-command testf)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Fortran")
        SET_PROPERTY(TEST Fortran APPEND PROPERTY LABELS "Fortran")

        IF (CMAKE_Fortran_COMPILER_SUPPORTS_F90
            # FIXME(lfortran): The compiler fails on the test's modules.
            AND NOT CMAKE_Fortran_COMPILER_ID STREQUAL "LFortran"
        )
            IF (DEFINED CMake_TEST_Fortran_SUBMODULES)
                LIST(PREPEND CMake_TEST_FortranModules_BUILD_OPTIONS -DCMake_TEST_Fortran_SUBMODULES:BOOL=${CMake_TEST_Fortran_SUBMODULES})
            ENDIF ()
            ADD_TEST(FortranModules ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/FortranModules"
                "${CMake_BINARY_DIR}/Tests/FortranModules"
                ${build_generator_args}
                --build-project FortranModules
                --build-options
                -DCMake_TEST_NESTED_MAKE_PROGRAM:FILEPATH=${CMake_TEST_EXPLICIT_MAKE_PROGRAM}
                ${CMake_TEST_FortranModules_BUILD_OPTIONS}
            )
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/FortranModules")
            SET_PROPERTY(TEST FortranModules APPEND PROPERTY LABELS "Fortran")
        ENDIF ()

        # FortranCInterface tests.
        IF (UNIX)
            CONFIGURE_FILE(${CMAKE_CURRENT_SOURCE_DIR}/FortranC/Flags.cmake.in
                ${CMAKE_CURRENT_BINARY_DIR}/FortranC/Flags.cmake @ONLY)
            ADD_TEST(FortranC.Flags ${CMAKE_CMAKE_COMMAND} -P
                ${CMAKE_CURRENT_BINARY_DIR}/FortranC/Flags.cmake)
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/FortranC/Flags")
            SET_PROPERTY(TEST FortranC.Flags APPEND PROPERTY LABELS "Fortran")
        ELSE ()
            ADD_TEST(FortranC ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/FortranC"
                "${CMake_BINARY_DIR}/Tests/FortranC"
                ${build_generator_args}
                --build-project FortranC
                --build-two-config
                --test-command CMakeFiles/FortranCInterface/FortranCInterface)
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/FortranC")
            SET_PROPERTY(TEST FortranC APPEND PROPERTY LABELS "Fortran")
        ENDIF ()
    ENDIF ()

    IF (NOT DEFINED CMake_TEST_Java)
        IF (APPLE OR MINGW)
            SET(CMake_TEST_Java 0)
        ELSE ()
            SET(CMake_TEST_Java 1)
        ENDIF ()
    ENDIF ()
    IF (CMake_TEST_Java)
        FIND_PACKAGE(Java COMPONENTS Development QUIET)
    ENDIF ()
    IF (Java_JAVA_EXECUTABLE AND Java_JAVAC_EXECUTABLE AND Java_JAR_EXECUTABLE)

        SET(JavaExportImport_BUILD_OPTIONS -DCMake_TEST_NESTED_MAKE_PROGRAM:FILEPATH=${CMake_TEST_EXPLICIT_MAKE_PROGRAM})
        ADD_TEST_MACRO(JavaExportImport JavaExportImport)

        IF ("${Java_VERSION}" VERSION_GREATER_EQUAL 9)
            SET(JavaModExportImport_BUILD_OPTIONS -DCMake_TEST_NESTED_MAKE_PROGRAM:FILEPATH=${CMake_TEST_EXPLICIT_MAKE_PROGRAM})
            ADD_TEST_MACRO(JavaModExportImport JavaModExportImport)
        ENDIF ()

        GET_FILENAME_COMPONENT(JAVACPATH ${Java_JAVAC_EXECUTABLE} REALPATH)
        GET_FILENAME_COMPONENT(JNIPATH ${JAVACPATH} PATH)
        FIND_FILE(JNI_H jni.h
            "${JNIPATH}/../include"
            "${JNIPATH}/../java/include")
        IF (JNI_H AND EXISTS "${JNI_H}") # in case jni.h is a broken symlink
            FILE(READ "${JNI_H}" JNI_FILE)
            IF ("${JNI_FILE}" MATCHES "JDK1_2")

                EXECUTE_PROCESS(
                    COMMAND "${Java_JAVA_EXECUTABLE}" -version
                    OUTPUT_VARIABLE _version ERROR_VARIABLE _version RESULT_VARIABLE _result
                )

                # E2K has broken Java RVM before 3.5.2
                IF (CMAKE_HOST_SYSTEM_PROCESSOR STREQUAL "e2k" AND _result EQUAL 0)
                    STRING(REGEX MATCH "RVM ([0-9.]+)" RVMVER "${_version}")
                    # Consider empty match a broken version too
                    IF ("${CMAKE_MATCH_1}" VERSION_LESS "3.5.2")
                        SET(BROKEN_RVM TRUE)
                    ENDIF ()
                ENDIF ()

                IF (NOT BROKEN_RVM)
                    ADD_TEST(NAME Java.Jar COMMAND ${CMAKE_CTEST_COMMAND} -C $<CONFIG>
                        --build-and-test
                        "${CMake_SOURCE_DIR}/Tests/Java"
                        "${CMake_BINARY_DIR}/Tests/JavaJar"
                        ${build_generator_args}
                        --build-project hello
                        --build-run-dir "${CMake_BINARY_DIR}/Tests/JavaJar/"
                        --test-command ${CMAKE_CTEST_COMMAND} -V -C $<CONFIG>)
                    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/JavaJar")

                    # For next tests, java tool must have same architecture as toolchain
                    MATH(EXPR _object_mode "${CMAKE_SIZEOF_VOID_P} * 8")
                    IF (_result EQUAL 0 AND _version MATCHES "${_object_mode}-Bit")
                        ## next test is valid only if Java version is less than 1.10
                        IF ("${Java_VERSION}" VERSION_LESS 1.10)
                            ADD_TEST(NAME Java.Javah COMMAND ${CMAKE_CTEST_COMMAND} -C $<CONFIG>
                                --build-and-test
                                "${CMake_SOURCE_DIR}/Tests/JavaJavah"
                                "${CMake_BINARY_DIR}/Tests/JavaJavah"
                                ${build_generator_args}
                                --build-project helloJavah
                                --build-run-dir "${CMake_BINARY_DIR}/Tests/JavaJavah/"
                                --test-command ${CMAKE_CTEST_COMMAND} -V -C $<CONFIG>)
                            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/JavaJavah")
                        ENDIF ()
                        ## next test is valid only if Java is, at least, version 1.8
                        IF (NOT "${Java_VERSION}" VERSION_LESS 1.8)
                            ADD_TEST(NAME Java.NativeHeaders COMMAND ${CMAKE_CTEST_COMMAND} -C $<CONFIG>
                                --build-and-test
                                "${CMake_SOURCE_DIR}/Tests/JavaNativeHeaders"
                                "${CMake_BINARY_DIR}/Tests/JavaNativeHeaders"
                                ${build_generator_args}
                                --build-project helloJavaNativeHeaders
                                --build-run-dir "${CMake_BINARY_DIR}/Tests/JavaNativeHeaders/"
                                --build-target install
                                --build-options
                                "-DCMAKE_INSTALL_PREFIX:PATH=${CMake_BINARY_DIR}/Tests/JavaNativeHeaders/Install"
                                --test-command ${CMAKE_CTEST_COMMAND} -V -C $<CONFIG>)
                            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/JavaNativeHeaders")
                        ENDIF ()
                    ENDIF ()
                ENDIF ()
            ENDIF ()
        ENDIF ()
    ENDIF ()

    # add some cross compiler tests, for now only with makefile based generators
    IF (CMAKE_GENERATOR MATCHES "Makefiles")

        # if sdcc is found, build the SimpleCOnly project with sdcc
        FIND_PROGRAM(SDCC_EXECUTABLE sdcc)
        MARK_AS_ADVANCED(SDCC_EXECUTABLE)
        IF (SDCC_EXECUTABLE)
            ADD_TEST(SimpleCOnly_sdcc ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/SimpleCOnly"
                "${CMake_BINARY_DIR}/Tests/SimpleCOnly_sdcc"
                ${build_generator_args}
                --build-project SimpleC
                --build-options
                "-DCMAKE_SYSTEM_NAME=Generic"
                "-DCMAKE_C_COMPILER=${SDCC_EXECUTABLE}")
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/SimpleCOnly_sdcc")
        ENDIF ()

        # If a Linux -> MinGW cross compiler is found then try it
        FIND_PROGRAM(MINGW_CC_LINUX2WIN_EXECUTABLE i586-mingw32msvc-gcc)
        FIND_PROGRAM(MINGW_CXX_LINUX2WIN_EXECUTABLE i586-mingw32msvc-g++)
        FIND_PROGRAM(MINGW_RC_LINUX2WIN_EXECUTABLE i586-mingw32msvc-windres)
        MARK_AS_ADVANCED(MINGW_CC_LINUX2WIN_EXECUTABLE MINGW_CXX_LINUX2WIN_EXECUTABLE MINGW_RC_LINUX2WIN_EXECUTABLE)
        IF (MINGW_CC_LINUX2WIN_EXECUTABLE AND MINGW_CXX_LINUX2WIN_EXECUTABLE AND MINGW_RC_LINUX2WIN_EXECUTABLE)
            ADD_TEST(Simple_Mingw_Linux2Win ${CMAKE_CTEST_COMMAND}
                --build-and-test
                "${CMake_SOURCE_DIR}/Tests/Simple"
                "${CMake_BINARY_DIR}/Tests/Simple_Mingw_Linux2Win"
                ${build_generator_args}
                --build-project Simple
                --build-options
                "-DCMAKE_SYSTEM_NAME=Windows"
                "-DCMAKE_C_COMPILER=${MINGW_CC_LINUX2WIN_EXECUTABLE}"
                "-DCMAKE_CXX_COMPILER=${MINGW_CXX_LINUX2WIN_EXECUTABLE}"
                "-DCMAKE_RC_COMPILER=${MINGW_RC_LINUX2WIN_EXECUTABLE}"
            )
            LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/Simple_Mingw_Linux2Win")
        ENDIF ()
    ENDIF ()

    IF (CMAKE_TEST_PROJECT_CSE_DIR)
        SET(script "${CMAKE_TEST_PROJECT_CSE_DIR}/BuildProjectCSE.cmake")
        IF (NOT EXISTS "${script}")
            SET(script "${CMAKE_TEST_PROJECT_CSE_DIR}/cse_build.cmake")
        ENDIF ()
        IF (NOT EXISTS "${script}")
            MESSAGE("warning: CMAKE_TEST_PROJECT_CSE_DIR set, but no build script found...")
        ENDIF ()

        ADD_TEST(BuildCSE ${CMAKE_CTEST_COMMAND} -V -S "${script}")
        SET_TESTS_PROPERTIES(BuildCSE PROPERTIES TIMEOUT 5400)
    ENDIF ()

    IF (CMAKE_TEST_PLPLOT_DIR)
        ADD_TEST(plplot ${CMAKE_CTEST_COMMAND} -V -S ${CMAKE_TEST_PLPLOT_DIR}/../../EasyDashboardScripts/plplot.cmake)
        SET_TESTS_PROPERTIES(plplot PROPERTIES TIMEOUT 5400)
    ENDIF ()

    IF (CMAKE_TEST_CHICKEN_DIR)
        ADD_TEST(Chicken ${CMAKE_CTEST_COMMAND} -V -S ${CMAKE_TEST_CHICKEN_DIR}/../../EasyDashboardScripts/Chicken.cmake)
        SET_TESTS_PROPERTIES(Chicken PROPERTIES TIMEOUT 5400)
    ENDIF ()

    IF (CMAKE_TEST_KDELIBS_ALPHA_1_DIR)
        ADD_TEST(KDELibsAlpha1 ${CMAKE_CTEST_COMMAND} -V -S ${CMAKE_TEST_KDELIBS_ALPHA_1_DIR}/../../EasyDashboardScripts/kdelibs.cmake)
        SET_TESTS_PROPERTIES(KDELibsAlpha1 PROPERTIES TIMEOUT 5400)
    ENDIF ()

    # Define a set of "contract" tests, each activated by a cache entry
    # named "CMake_TEST_CONTRACT_<project>".  For each Contract test,
    # the project should provide a directory with a CMakeLists.txt file
    # that uses ExternalProject to download and configure the project.
    # The directory should also contain a Configure.cmake file that
    # sets "CMake_TEST_CONTRACT_<project>_<var>" variables to configure
    # the code below.
    FOREACH (project IN ITEMS PLplot Trilinos VTK)
        IF (CMake_TEST_CONTRACT_${project})
            INCLUDE(Contracts/${project}/Configure.cmake)
            ADD_TEST_MACRO(Contracts.${project} ${CMake_TEST_CONTRACT_${project}_RUN_TEST})
            # The external projects may take a long time to build.
            IF (DEFINED CMake_TEST_CONTRACT_${project}_TIMEOUT)
                SET(timeout ${CMake_TEST_CONTRACT_${project}_TIMEOUT})
            ELSEIF (CMake_TEST_CONTRACT_DEFAULT_TIMEOUT)
                SET(timeout ${CMake_TEST_CONTRACT_DEFAULT_TIMEOUT})
            ELSE ()
                SET(timeout 21600)
            ENDIF ()
            SET_PROPERTY(TEST Contracts.${project} PROPERTY TIMEOUT "${timeout}")
        ENDIF ()
    ENDFOREACH ()

    IF (TEST_CompileCommandOutput)
        SET(CompileCommandOutput_BUILD_OPTIONS
            -DMAKE_SUPPORTS_SPACES=${MAKE_SUPPORTS_SPACES})
        ADD_TEST_MACRO(CompileCommandOutput
            "${CMake_BINARY_DIR}/Tests/CMakeLib/runcompilecommands")
    ENDIF ()

    ADD_TEST(IncludeDirectories ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/IncludeDirectories"
        "${CMake_BINARY_DIR}/Tests/IncludeDirectories"
        --build-two-config
        ${build_generator_args}
        --build-project IncludeDirectories
        --build-options
        -DMAKE_SUPPORTS_SPACES=${MAKE_SUPPORTS_SPACES}
        --test-command IncludeDirectories)
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/IncludeDirectories")

    IF (CMAKE_GENERATOR MATCHES "^((Unix|MSYS) Makefiles|Ninja|FASTBuild)$" AND
        ((CMAKE_CXX_COMPILER_ID STREQUAL "GNU" AND CMAKE_CXX_COMPILER_VERSION VERSION_GREATER 4.4)
      OR (CMAKE_CXX_COMPILER_ID STREQUAL "Clang" AND NOT "x${CMAKE_CXX_SIMULATE_ID}" STREQUAL "xMSVC")
      OR (CMAKE_CXX_COMPILER_ID STREQUAL "LCC")
      OR (CMAKE_CXX_COMPILER_ID STREQUAL "AppleClang"))
    )
        ADD_TEST(IncludeDirectoriesCPATH ${CMAKE_CTEST_COMMAND}
            --build-and-test
            "${CMake_SOURCE_DIR}/Tests/IncludeDirectoriesCPATH"
            "${CMake_BINARY_DIR}/Tests/IncludeDirectoriesCPATH"
            --build-two-config
            ${build_generator_args}
            --build-project IncludeDirectoriesCPATH)
        LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/IncludeDirectoriesCPATH")
        SET_TESTS_PROPERTIES(IncludeDirectoriesCPATH
            PROPERTIES
            ENVIRONMENT "CPATH=${CMAKE_CURRENT_SOURCE_DIR}/IncludeDirectoriesCPATH/viacpath")
    ENDIF ()

    ADD_TEST(InterfaceLinkLibraries ${CMAKE_CTEST_COMMAND}
        --build-and-test
        "${CMake_SOURCE_DIR}/Tests/InterfaceLinkLibraries"
        "${CMake_BINARY_DIR}/Tests/InterfaceLinkLibraries"
        --build-two-config
        ${build_generator_args}
        --build-project InterfaceLinkLibraries
        --test-command InterfaceLinkLibraries)
    LIST(APPEND TEST_BUILD_DIRS "${CMake_BINARY_DIR}/Tests/InterfaceLinkLibraries")

    ADD_TEST_MACRO(InterfaceLinkLibrariesDirect)

    IF (NOT CMake_TEST_EXTERNAL_CMAKE)
        ADD_SUBDIRECTORY(CMakeTests)
    ENDIF ()

    IF (BUILD_QtDialog AND CMake_TEST_GUI AND NOT CMake_TEST_EXTERNAL_CMAKE)
        ADD_SUBDIRECTORY(CMakeGUI)
    ENDIF ()

    # Run CheckSourceTree as the very last test in the CMake/CTest/CPack test
    # suite. It detects if any changes have been made to the CMake source tree
    # by any previous configure, build or test steps.
    IF (GIT_EXECUTABLE AND EXISTS "${CMake_SOURCE_DIR}/.git"
        AND NOT "${CMake_SOURCE_DIR}" STREQUAL "${CMake_BINARY_DIR}")
        ADD_SUBDIRECTORY(CheckSourceTree)
    ENDIF ()

    # If this is not an in-source build, provide a target to wipe out
    # all the test build directories. This must come at the end after
    # all the above logic has finished adding to TEST_BUILD_DIRS
    IF (NOT EXISTS "${CMake_BINARY_DIR}/CMakeLists.txt")
        CONFIGURE_FILE(${CMake_SOURCE_DIR}/Tests/test_clean.cmake.in
            ${CMake_BINARY_DIR}/Tests/test_clean.cmake @ONLY)
        ADD_CUSTOM_TARGET(test_clean
            COMMAND ${CMAKE_COMMAND} -P ${CMake_BINARY_DIR}/Tests/test_clean.cmake
            COMMENT "Removing test build directories."
        )
    ENDIF ()
ENDIF ()
