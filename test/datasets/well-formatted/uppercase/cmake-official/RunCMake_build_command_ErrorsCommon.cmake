# This CMakeLists file is *sometimes expected* to result in a configure error.
#
# expect this to succeed:
# ../bin/Release/cmake -G Xcode
#   ../../CMake/Tests/CMakeCommands/build_command
#
# expect this to fail:
# ../bin/Release/cmake -DTEST_ERROR_CONDITIONS:BOOL=ON -G Xcode
#   ../../CMake/Tests/CMakeCommands/build_command
#
# This project exists merely to test the CMake command 'build_command'...
# ...even purposefully calling it with known-bad argument lists to cover
# error handling code.
#

SET(cmd "initial")

MESSAGE("0. begin")

IF (TEST_ERROR_CONDITIONS)
    # Test with no arguments (an error):
    BUILD_COMMAND()
    MESSAGE("1. cmd='${cmd}'")

    # Test with unknown arguments (also an error):
    BUILD_COMMAND(cmd BOGUS STUFF)
    MESSAGE("2. cmd='${cmd}'")

    BUILD_COMMAND(cmd STUFF BOGUS)
    MESSAGE("3. cmd='${cmd}'")
ELSE ()
    MESSAGE("(skipping cases 1, 2 and 3 because TEST_ERROR_CONDITIONS is OFF)")
ENDIF ()

# Test the one arg signature with none of the optional KEYWORD arguments:
BUILD_COMMAND(cmd)
MESSAGE("4. cmd='${cmd}'")

# Test the two-arg legacy signature:
BUILD_COMMAND(legacy_cmd ${CMAKE_MAKE_PROGRAM})
MESSAGE("5. legacy_cmd='${legacy_cmd}'")
MESSAGE("   CMAKE_MAKE_PROGRAM='${CMAKE_MAKE_PROGRAM}'")

# Test the optional KEYWORDs:
BUILD_COMMAND(cmd CONFIGURATION hoohaaConfig)
MESSAGE("6. cmd='${cmd}'")

BUILD_COMMAND(cmd PROJECT_NAME hoohaaProject)
MESSAGE("7. cmd='${cmd}'")

BUILD_COMMAND(cmd TARGET hoohaaTarget)
MESSAGE("8. cmd='${cmd}'")

SET(cmd "final")
MESSAGE("9. cmd='${cmd}'")
