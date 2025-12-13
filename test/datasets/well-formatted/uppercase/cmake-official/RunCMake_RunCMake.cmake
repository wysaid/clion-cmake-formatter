# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file LICENSE.rst or https://cmake.org/licensing for details.

FOREACH (
    arg
    IN ITEMS
    RunCMake_GENERATOR
    RunCMake_SOURCE_DIR
    RunCMake_BINARY_DIR
)
    IF (NOT DEFINED ${arg})
        MESSAGE(FATAL_ERROR "${arg} not given!")
    ENDIF ()
ENDFOREACH ()

FUNCTION(run_cmake test)
    IF (DEFINED ENV{RunCMake_TEST_FILTER})
        SET(test_and_variant "${test}${RunCMake_TEST_VARIANT_DESCRIPTION}")
        IF (NOT test_and_variant MATCHES "$ENV{RunCMake_TEST_FILTER}")
            RETURN()
        ENDIF ()
        UNSET(test_and_variant)
    ENDIF ()

    SET(top_src "${RunCMake_SOURCE_DIR}")
    SET(top_bin "${RunCMake_BINARY_DIR}")
    IF (EXISTS ${top_src}/${test}-result.txt)
        FILE(READ ${top_src}/${test}-result.txt expect_result)
        STRING(REGEX REPLACE "\n+$" "" expect_result "${expect_result}")
    ELSEIF (DEFINED RunCMake_TEST_EXPECT_RESULT)
        SET(expect_result "${RunCMake_TEST_EXPECT_RESULT}")
    ELSE ()
        SET(expect_result 0)
    ENDIF ()

    STRING(TOLOWER ${CMAKE_HOST_SYSTEM_NAME} platform_name)
    #remove all additional bits from cygwin/msys name
    IF (platform_name MATCHES cygwin)
        SET(platform_name cygwin)
    ENDIF ()
    IF (platform_name MATCHES msys)
        SET(platform_name msys)
    ENDIF ()

    FOREACH (o IN ITEMS stdout stderr config)
        IF (RunCMake-${o}-file AND EXISTS ${top_src}/${RunCMake-${o}-file})
            FILE(READ ${top_src}/${RunCMake-${o}-file} expect_${o})
            STRING(REGEX REPLACE "\n+$" "" expect_${o} "${expect_${o}}")
        ELSEIF (EXISTS ${top_src}/${test}-${o}-${platform_name}.txt)
            FILE(READ ${top_src}/${test}-${o}-${platform_name}.txt expect_${o})
            STRING(REGEX REPLACE "\n+$" "" expect_${o} "${expect_${o}}")
        ELSEIF (EXISTS ${top_src}/${test}-${o}.txt)
            FILE(READ ${top_src}/${test}-${o}.txt expect_${o})
            STRING(REGEX REPLACE "\n+$" "" expect_${o} "${expect_${o}}")
        ELSEIF (DEFINED RunCMake_TEST_EXPECT_${o})
            STRING(REGEX REPLACE "\n+$" "" expect_${o} "${RunCMake_TEST_EXPECT_${o}}")
        ELSE ()
            UNSET(expect_${o})
        ENDIF ()
    ENDFOREACH ()
    FOREACH (o IN ITEMS stdout stderr config)
        IF (DEFINED RunCMake_TEST_NOT_EXPECT_${o})
            STRING(REGEX REPLACE "\n+$" "" not_expect_${o} "${RunCMake_TEST_NOT_EXPECT_${o}}")
        ENDIF ()
    ENDFOREACH ()
    IF (NOT expect_stderr)
        IF (NOT RunCMake_DEFAULT_stderr)
            SET(RunCMake_DEFAULT_stderr "^$")
        ENDIF ()
        SET(expect_stderr ${RunCMake_DEFAULT_stderr})
    ENDIF ()

    IF (NOT RunCMake_TEST_SOURCE_DIR)
        SET(RunCMake_TEST_SOURCE_DIR "${top_src}")
    ENDIF ()
    IF (NOT RunCMake_TEST_BINARY_DIR)
        SET(RunCMake_TEST_BINARY_DIR "${top_bin}/${test}-build")
    ENDIF ()
    IF (NOT RunCMake_TEST_NO_CLEAN)
        FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    ENDIF ()
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")
    IF (RunCMake-prep-file AND EXISTS ${top_src}/${RunCMake-prep-file})
        INCLUDE(${top_src}/${RunCMake-prep-file})
    ELSE ()
        INCLUDE(${top_src}/${test}-prep.cmake OPTIONAL)
    ENDIF ()
    IF (RunCMake_TEST_OUTPUT_MERGE)
        SET(actual_stderr_var actual_stdout)
        SET(actual_stderr "")
    ELSE ()
        SET(actual_stderr_var actual_stderr)
    ENDIF ()
    IF (DEFINED RunCMake_TEST_TIMEOUT)
        SET(maybe_timeout TIMEOUT ${RunCMake_TEST_TIMEOUT})
    ELSE ()
        SET(maybe_timeout "")
    ENDIF ()
    IF (RunCMake-stdin-file AND EXISTS ${top_src}/${RunCMake-stdin-file})
        SET(maybe_input_file INPUT_FILE ${top_src}/${RunCMake-stdin-file})
    ELSEIF (EXISTS ${top_src}/${test}-stdin.txt)
        SET(maybe_input_file INPUT_FILE ${top_src}/${test}-stdin.txt)
    ELSE ()
        SET(maybe_input_file "")
    ENDIF ()
    IF (NOT RunCMake_TEST_COMMAND)
        IF (NOT DEFINED RunCMake_TEST_OPTIONS)
            SET(RunCMake_TEST_OPTIONS "")
        ENDIF ()
        IF (RunCMake_TEST_LCC AND NOT RunCMake_TEST_NO_CMP0129)
            LIST(APPEND RunCMake_TEST_OPTIONS -DCMAKE_POLICY_DEFAULT_CMP0129=NEW)
        ENDIF ()
        IF (CMAKE_HOST_SYSTEM_NAME STREQUAL "AIX")
            LIST(APPEND RunCMake_TEST_OPTIONS -DCMAKE_POLICY_DEFAULT_CMP0182=NEW)
        ENDIF ()
        IF (RunCMake_MAKE_PROGRAM)
            LIST(APPEND RunCMake_TEST_OPTIONS "-DCMAKE_MAKE_PROGRAM=${RunCMake_MAKE_PROGRAM}")
        ENDIF ()
        SET(RunCMake_TEST_COMMAND ${CMAKE_COMMAND})
        IF (NOT RunCMake_TEST_NO_SOURCE_DIR)
            LIST(APPEND RunCMake_TEST_COMMAND "${RunCMake_TEST_SOURCE_DIR}")
        ENDIF ()
        LIST(APPEND RunCMake_TEST_COMMAND -G "${RunCMake_GENERATOR}")
        IF (RunCMake_GENERATOR_PLATFORM)
            LIST(APPEND RunCMake_TEST_COMMAND -A "${RunCMake_GENERATOR_PLATFORM}")
        ENDIF ()
        IF (RunCMake_GENERATOR_TOOLSET)
            LIST(APPEND RunCMake_TEST_COMMAND -T "${RunCMake_GENERATOR_TOOLSET}")
        ENDIF ()
        IF (RunCMake_GENERATOR_INSTANCE)
            LIST(APPEND RunCMake_TEST_COMMAND "-DCMAKE_GENERATOR_INSTANCE=${RunCMake_GENERATOR_INSTANCE}")
        ENDIF ()
        LIST(APPEND RunCMake_TEST_COMMAND
            -DRunCMake_TEST=${test}
            --no-warn-unused-cli
        )
    ELSE ()
        SET(RunCMake_TEST_OPTIONS "")
    ENDIF ()
    IF (NOT DEFINED RunCMake_TEST_RAW_ARGS)
        SET(RunCMake_TEST_RAW_ARGS "")
    ENDIF ()
    IF (NOT RunCMake_TEST_COMMAND_WORKING_DIRECTORY)
        SET(RunCMake_TEST_COMMAND_WORKING_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")
    ENDIF ()
    IF (NOT RunCMake_CHECK_ONLY)
        STRING(CONCAT _code [[execute_process(
      COMMAND ${RunCMake_TEST_COMMAND}
              ${RunCMake_TEST_OPTIONS}
              ]] "${RunCMake_TEST_RAW_ARGS}\n" [[
      WORKING_DIRECTORY "${RunCMake_TEST_COMMAND_WORKING_DIRECTORY}"
      OUTPUT_VARIABLE actual_stdout
      ERROR_VARIABLE ${actual_stderr_var}
      RESULT_VARIABLE actual_result
      ENCODING UTF8
      ${maybe_timeout}
      ${maybe_input_file}
      )]])
    ELSE ()
        SET(expect_result "")
    ENDIF ()
    IF (DEFINED ENV{PWD})
        SET(old_pwd "$ENV{PWD}")
    ELSE ()
        SET(old_pwd)
    ENDIF ()
    IF (RunCMake_TEST_COMMAND_PWD)
        SET(ENV{PWD} "${RunCMake_TEST_COMMAND_PWD}")
    ELSE ()
        # Emulate a shell using this directory.
        SET(ENV{PWD} "${RunCMake_TEST_COMMAND_WORKING_DIRECTORY}")
    ENDIF ()
    CMAKE_LANGUAGE(EVAL CODE "${_code}")
    IF (DEFINED old_pwd)
        SET(ENV{PWD} "${old_pwd}")
    ELSE ()
        SET(ENV{PWD})
    ENDIF ()
    SET(msg "")
    IF (NOT "${actual_result}" MATCHES "${expect_result}")
        STRING(APPEND msg "Result is [${actual_result}], not [${expect_result}].\n")
    ENDIF ()
    SET(config_file "${RunCMake_TEST_COMMAND_WORKING_DIRECTORY}/CMakeFiles/CMakeConfigureLog.yaml")
    IF (EXISTS "${config_file}")
        FILE(READ "${config_file}" actual_config)
    ELSE ()
        SET(actual_config "")
    ENDIF ()

    # Special case: remove ninja no-op line from stderr, but not stdout.
    # Test cases that look for it should use RunCMake_TEST_OUTPUT_MERGE.
    STRING(REGEX REPLACE "(^|\r?\n)ninja: no work to do\\.\r?\n" "\\1" actual_stderr "${actual_stderr}")

    # Remove incidental content from both stdout and stderr.
    STRING(CONCAT ignore_line_regex
        "(^|\n)((==[0-9]+=="
        "|[^\n]*BullseyeCoverage "
        "|[a-z]+\\([0-9]+\\) malloc:"
        "|clang[^:]*: warning: the object size sanitizer has no effect at -O0, but is explicitly enabled:"
        "|flang-new: warning: argument unused during compilation: .-flang-experimental-exec."
        "|icp?x: remark: Note that use of .-g. without any optimization-level option will turn off most compiler optimizations"
        "|ifx: remark #10440: Note that use of a debug option without any optimization-level option will turnoff most compiler optimizations"
        "|lld-link: warning: procedure symbol record for .* refers to PDB item index [0-9A-Fa-fx]+ which is not a valid function ID record"
        "|ld: warning: .* has a LOAD segment with RWX permissions"
        "|Error kstat returned"
        "|Hit xcodebuild bug"
        "|Recompacting log\\.\\.\\."

        "|LICENSE WARNING:"
        "|Your license to use PGI[^\n]*expired"
        "|Please obtain a new version at"
        "|contact PGI Sales at"
        "|ic(p?c|l): remark #10441: The Intel\\(R\\) C\\+\\+ Compiler Classic \\(ICC\\) is deprecated"

        "|[^\n]*install_name_tool: warning: changes being made to the file will invalidate the code signature in:"
        "|[^\n]*(createItemModels|_NSMainThread|Please file a bug at)"
        "|[^\n]*xcodebuild[^\n]*DVTAssertions: Warning"
        "|[^\n]*xcodebuild[^\n]*DVTCoreDeviceEnabledState: DVTCoreDeviceEnabledState_Disabled set via user default"
        "|[^\n]*xcodebuild[^\n]*DVTPlugInManager"
        "|[^\n]*xcodebuild[^\n]*DVTSDK: Warning: SDK path collision for path"
        "|[^\n]*xcodebuild[^\n]*IDERunDestination: Supported platforms for the buildables in the current scheme is empty"
        "|[^\n]*xcodebuild[^\n]*Requested but did not find extension point with identifier"
        "|[^\n]*xcodebuild[^\n]*nil host used in call to allows.*HTTPSCertificateForHost"
        "|[^\n]*xcodebuild[^\n]*warning: file type[^\n]*is based on missing file type"
        "|[^\n]*objc[^\n]*: Class [^\n]* One of the two will be used. Which one is undefined."
        "|[^\n]*is a member of multiple groups"
        "|[^\n]*offset in archive not a multiple of 8"
        "|[^\n]*from Time Machine by path"
        "|[^\n]*Bullseye Testing Technology"
        ${RunCMake_TEST_EXTRA_IGNORE_LINE_REGEX}
        ")[^\n]*\n)+"
    )
    IF (RunCMake_IGNORE_POLICY_VERSION_DEPRECATION)
        STRING(REGEX REPLACE [[
^CMake Deprecation Warning at [^
]*CMakeLists.txt:1 \(cmake_minimum_required\):
  Compatibility with CMake < 3\.10 will be removed from a future version of
  CMake.

  Update the VERSION argument <min> value\.  Or, use the <min>\.\.\.<max> syntax
  to tell CMake that the project requires at least <min> but has been updated
  to work with policies introduced by <max> or earlier\.
+
]] "" actual_stderr "${actual_stderr}")
    ENDIF ()
    FOREACH (o IN ITEMS stdout stderr config)
        STRING(REGEX REPLACE "\r\n" "\n" actual_${o} "${actual_${o}}")
        STRING(REGEX REPLACE "${ignore_line_regex}" "\\1" actual_${o} "${actual_${o}}")
        STRING(REGEX REPLACE "\n+$" "" actual_${o} "${actual_${o}}")
        IF (DEFINED expect_${o})
            IF (NOT "${actual_${o}}" MATCHES "${expect_${o}}")
                STRING(APPEND msg "${o} does not match that expected.\n")
            ENDIF ()
        ENDIF ()
        IF (DEFINED not_expect_${o})
            IF ("${actual_${o}}" MATCHES "${not_expect_${o}}")
                STRING(APPEND msg "${o} matches that not expected.\n")
            ENDIF ()
        ENDIF ()
    ENDFOREACH ()
    UNSET(RunCMake_TEST_FAILED)
    UNSET(RunCMake_TEST_FAILURE_MESSAGE)
    IF (RunCMake-check-file AND EXISTS ${top_src}/${RunCMake-check-file})
        INCLUDE(${top_src}/${RunCMake-check-file})
    ELSE ()
        INCLUDE(${top_src}/${test}-check.cmake OPTIONAL)
    ENDIF ()
    IF (RunCMake_TEST_FAILED)
        SET(msg "${RunCMake_TEST_FAILED}\n${msg}")
    ENDIF ()
    IF (msg AND NOT RunCMake_CHECK_ONLY)
        STRING(REPLACE ";" "\" \"" command "\"${RunCMake_TEST_COMMAND}\"")
        IF (RunCMake_TEST_OPTIONS)
            STRING(REPLACE ";" "\" \"" options "\"${RunCMake_TEST_OPTIONS}\"")
            STRING(APPEND command " ${options}")
        ENDIF ()
        IF (RunCMake_TEST_RAW_ARGS)
            STRING(APPEND command " ${RunCMake_TEST_RAW_ARGS}")
        ENDIF ()
        STRING(APPEND msg "Command was:\n command> ${command}\n")

        FOREACH (o IN ITEMS stdout stderr config)
            IF (DEFINED expect_${o})
                STRING(REGEX REPLACE "\n" "\n expect-${o}> " expect_${o} " expect-${o}> ${expect_${o}}")
                STRING(APPEND msg "Expected ${o} to match:\n${expect_${o}}\n")
            ENDIF ()
            IF (NOT o STREQUAL "config" OR DEFINED expect_${o})
                STRING(REGEX REPLACE "\n" "\n actual-${o}> " actual_${o} " actual-${o}> ${actual_${o}}")
                STRING(APPEND msg "Actual ${o}:\n${actual_${o}}\n")
            ENDIF ()
        ENDFOREACH ()
        IF (RunCMake_TEST_FAILURE_MESSAGE)
            STRING(APPEND msg "${RunCMake_TEST_FAILURE_MESSAGE}")
        ENDIF ()
    ENDIF ()
    IF (msg)
        MESSAGE(SEND_ERROR "${test}${RunCMake_TEST_VARIANT_DESCRIPTION} - FAILED:\n${msg}")
    ELSE ()
        MESSAGE(STATUS "${test}${RunCMake_TEST_VARIANT_DESCRIPTION} - PASSED")
    ENDIF ()
ENDFUNCTION()

FUNCTION(run_cmake_command test)
    SET(RunCMake_TEST_COMMAND "${ARGN}")
    RUN_CMAKE(${test})
ENDFUNCTION()

FUNCTION(run_cmake_script test)
    SET(RunCMake_TEST_COMMAND ${CMAKE_COMMAND} ${ARGN} -P ${RunCMake_SOURCE_DIR}/${test}.cmake)
    RUN_CMAKE(${test})
ENDFUNCTION()

FUNCTION(run_cmake_with_options test)
    SET(RunCMake_TEST_OPTIONS "${ARGN}")
    RUN_CMAKE(${test})
ENDFUNCTION()

FUNCTION(run_cmake_with_raw_args test args)
    SET(RunCMake_TEST_RAW_ARGS "${args}")
    RUN_CMAKE(${test})
ENDFUNCTION()

FUNCTION(ensure_files_match expected_file actual_file)
    IF (NOT EXISTS "${expected_file}")
        MESSAGE(FATAL_ERROR "Expected file does not exist:\n  ${expected_file}")
    ENDIF ()
    IF (NOT EXISTS "${actual_file}")
        MESSAGE(FATAL_ERROR "Actual file does not exist:\n  ${actual_file}")
    ENDIF ()
    FILE(READ "${expected_file}" expected_file_content)
    FILE(READ "${actual_file}" actual_file_content)
    IF (NOT "${expected_file_content}" STREQUAL "${actual_file_content}")
        MESSAGE(FATAL_ERROR "Actual file content does not match expected:\n
    \n
      expected file: ${expected_file}\n
      expected content:\n
      ${expected_file_content}\n
    \n
      actual file: ${actual_file}\n
      actual content:\n
      ${actual_file_content}\n
    ")
    ENDIF ()
ENDFUNCTION()

FUNCTION(RunCMake_check_file type file expect_content)
    IF (EXISTS "${file}")
        FILE(READ "${file}" actual_content)
        STRING(REPLACE "\r\n" "\n" actual_content "${actual_content}")
        STRING(REGEX REPLACE "\n+$" "" actual_content "${actual_content}")
        STRING(REPLACE "\t" "  " actual_content "${actual_content}")
        IF (NOT actual_content MATCHES "${expect_content}")
            STRING(REPLACE "\n" "\n expect-${type}> " expect_content " expect-${type}> ${expect_content}")
            STRING(REPLACE "\n" "\n actual-${type}> " actual_content " actual-${type}> ${actual_content}")
            STRING(APPEND RunCMake_TEST_FAILED "${type} does not match that expected.\n"
                "Expected ${type} to match:\n${expect_content}\n"
                "Actual ${type}:\n${actual_content}\n"
            )
        ENDIF ()
    ELSE ()
        STRING(APPEND RunCMake_TEST_FAILED "${type} file does not exist:\n ${file}\n")
    ENDIF ()
    RETURN(PROPAGATE RunCMake_TEST_FAILED)
ENDFUNCTION()

FUNCTION(RunCMake_check_slnx slnx_file expect_slnx)
    RUNCMAKE_CHECK_FILE("slnx" "${slnx_file}" "${expect_slnx}")
    RETURN(PROPAGATE RunCMake_TEST_FAILED)
ENDFUNCTION()

# Get the user id on unix if possible.
FUNCTION(get_unix_uid var)
    SET("${var}" "" PARENT_SCOPE)
    IF (UNIX)
        SET(ID "id")
        IF (CMAKE_SYSTEM_NAME STREQUAL "SunOS" AND EXISTS "/usr/xpg4/bin/id")
            SET(ID "/usr/xpg4/bin/id")
        ENDIF ()
        EXECUTE_PROCESS(COMMAND ${ID} -u $ENV{USER} OUTPUT_VARIABLE uid ERROR_QUIET
            RESULT_VARIABLE status OUTPUT_STRIP_TRAILING_WHITESPACE)
        IF (status EQUAL 0)
            SET("${var}" "${uid}" PARENT_SCOPE)
        ENDIF ()
    ENDIF ()
ENDFUNCTION()

# Protect RunCMake tests from calling environment.
UNSET(ENV{MAKEFLAGS})
