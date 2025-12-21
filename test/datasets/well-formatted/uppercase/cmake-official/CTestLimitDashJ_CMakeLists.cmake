CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(CTestLimitDashJ NONE)

# This file demonstrates https://gitlab.kitware.com/cmake/cmake/-/issues/12904
# when configured with CMake 2.8.10.2 and earlier, and when running
# "ctest -j 4" in the resulting build tree. This example is hard-coded
# to assume -j 4 just to reproduce the issue easily. Adjust the
# FAIL_REGULAR_EXPRESSION and PROCESSORS values to reproduce this problem
# with a different ctest -j value...

IF (EXISTS "${CMAKE_BINARY_DIR}/Testing/Temporary/CTestCostData.txt")
    MESSAGE(STATUS "Removing CTestCostData.txt to force ordering by COST PROPERTY value rather than prior run data")
    FILE(REMOVE "${CMAKE_BINARY_DIR}/Testing/Temporary/CTestCostData.txt")
ENDIF ()

INCLUDE(CTest)

CONFIGURE_FILE(
    ${CMAKE_CURRENT_SOURCE_DIR}/CreateSleepDelete.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/CreateSleepDelete.cmake
    @ONLY
)

FOREACH (n RANGE 1 100)
    ADD_TEST(NAME t${n}
        COMMAND ${CMAKE_CTEST_COMMAND}
        -D basefilename=f${n}
        -S ${CMAKE_CURRENT_BINARY_DIR}/CreateSleepDelete.cmake
    )
    SET_PROPERTY(TEST t${n} PROPERTY FAIL_REGULAR_EXPRESSION "(c='[5-9]'|c='[1-9][0-9]+')")
ENDFOREACH ()

SET_PROPERTY(TEST t1 PROPERTY RUN_SERIAL 1)
SET_PROPERTY(TEST t1 PROPERTY PROCESSORS 4)

SET_PROPERTY(TEST t51 PROPERTY RUN_SERIAL 1)
SET_PROPERTY(TEST t51 PROPERTY PROCESSORS 4)

FOREACH (n RANGE 2 50)
    SET_PROPERTY(TEST t${n} PROPERTY DEPENDS t1)
ENDFOREACH ()
SET_PROPERTY(TEST t1 PROPERTY DEPENDS t51)
SET_PROPERTY(TEST t51 PROPERTY DEPENDS t100)

FOREACH (n 50)
    SET_PROPERTY(TEST t${n} PROPERTY COST 6)
ENDFOREACH ()
FOREACH (n RANGE 52 99)
    SET_PROPERTY(TEST t${n} PROPERTY COST 3)
ENDFOREACH ()
