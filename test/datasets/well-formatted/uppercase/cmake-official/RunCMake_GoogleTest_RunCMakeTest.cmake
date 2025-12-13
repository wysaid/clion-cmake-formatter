INCLUDE(RunCMake)

# Isolate our ctest runs from external environment.
UNSET(ENV{CTEST_PARALLEL_LEVEL})
UNSET(ENV{CTEST_OUTPUT_ON_FAILURE})

IF (RunCMake_GENERATOR STREQUAL "Borland Makefiles" OR
    RunCMake_GENERATOR STREQUAL "Watcom WMake")
    SET(fs_delay 3)
ELSE ()
    SET(fs_delay 1.125)
ENDIF ()

FUNCTION(run_GoogleTest DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTest -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE})

    RUN_CMAKE_COMMAND(GoogleTest-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target fake_gtest
    )

    RUN_CMAKE_COMMAND(GoogleTest-property-timeout-exe
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target property_timeout_test
    )

    RUN_CMAKE_COMMAND(GoogleTest-test1
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST1
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test2
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST2
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test3
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST3
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test4
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST4
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test5
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST5
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test6
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST6
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test7
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST7
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test8
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L TEST8
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-test-missing
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R no_tests_defined
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-property-timeout1
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R property_timeout\\.case_no_discovery
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-property-timeout2
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R property_timeout\\.case_with_discovery
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTest-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target skip_test
    )

    RUN_CMAKE_COMMAND(GoogleTest-skip-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R skip_test
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_Launcher_CMP0178 DISCOVERY_MODE cmp0178)
    IF (CMAKE_C_COMPILER_ID STREQUAL "MSVC" AND CMAKE_C_COMPILER_VERSION VERSION_LESS "14.0")
        RETURN()
    ENDIF ()
    IF (CMAKE_VS_PLATFORM_NAME STREQUAL "ARM64" AND CMAKE_C_COMPILER_ID STREQUAL "MSVC" AND CMAKE_C_COMPILER_VERSION VERSION_LESS "19.36")
        RETURN()
    ENDIF ()

    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/Launcher-CMP0178-${cmp0178}-build)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()

    RUN_CMAKE_WITH_OPTIONS(Launcher-CMP0178-${cmp0178}
        -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE}
    )

    SET(RunCMake_TEST_NO_CLEAN 1)

    # do not issue any warnings on stderr that would cause the build to fail
    SET(RunCMake_TEST_OUTPUT_MERGE 1)
    RUN_CMAKE_COMMAND(Launcher-CMP0178-${cmp0178}-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
    )
    UNSET(RunCMake_TEST_OUTPUT_MERGE)

    RUN_CMAKE_COMMAND(Launcher-CMP0178-${cmp0178}-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -V
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_GoogleTestXML DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTestXML-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTestXML -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE})

    RUN_CMAKE_COMMAND(GoogleTestXML-discovery
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target xml_output
    )

    RUN_CMAKE_COMMAND(GoogleTestXML-result
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R GoogleTestXML
        --no-label-summary
    )

    RUN_CMAKE_COMMAND(GoogleTestXML-special-result
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R GoogleTestXMLSpecial
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_GoogleTest_discovery_timeout DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-discovery-timeout)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTestDiscoveryTimeout -DDISCOVERY_MODE=${DISCOVERY_MODE})

    SET(RunCMake_TEST_OUTPUT_MERGE 1)
    RUN_CMAKE_COMMAND(GoogleTest-discovery-${DISCOVERY_MODE}-timeout-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target discovery_timeout_test
    )
    SET(RunCMake_TEST_OUTPUT_MERGE 0)

    RUN_CMAKE_COMMAND(GoogleTest-discovery-${DISCOVERY_MODE}-timeout-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R discovery_timeout_test
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_GoogleTest_discovery_arg_change DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-discovery-arg-change)
    SET(RunCMake_TEST_NO_CLEAN 1)
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTestDiscoveryArgChange
        -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE}
        -DTEST_FILTER=basic
    )
    RUN_CMAKE_COMMAND(GoogleTest-discovery-arg-change-build
        ${CMAKE_COMMAND}
        --build .
        --config Release
        --target fake_gtest
    )
    RUN_CMAKE_COMMAND(GoogleTest-discovery-arg-change-basic
        ${CMAKE_CTEST_COMMAND}
        -C Release
        -N
    )
    EXECUTE_PROCESS(COMMAND ${CMAKE_COMMAND} -E sleep ${fs_delay}) # handle 1s resolution
    RUN_CMAKE_WITH_OPTIONS(GoogleTestDiscoveryArgChange
        -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE}
        -DTEST_FILTER=typed
    )
    RUN_CMAKE_COMMAND(GoogleTest-discovery-arg-change-build
        ${CMAKE_COMMAND}
        --build .
        --config Release
        --target fake_gtest
    )
    RUN_CMAKE_COMMAND(GoogleTest-discovery-arg-change-typed
        ${CMAKE_CTEST_COMMAND}
        -C Release
        -N
    )
ENDFUNCTION()

FUNCTION(run_GoogleTest_discovery_multi_config)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-discovery-multi-config)
    SET(RunCMake_TEST_NO_CLEAN 1)
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE(GoogleTestDiscoveryMultiConfig)

    RUN_CMAKE_COMMAND(GoogleTest-build-release
        ${CMAKE_COMMAND}
        --build .
        --config Release
        --target configuration_gtest
    )
    RUN_CMAKE_COMMAND(GoogleTest-build-debug
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target configuration_gtest
    )
    RUN_CMAKE_COMMAND(GoogleTest-configuration-release
        ${CMAKE_CTEST_COMMAND}
        -C Release
        -L CONFIG
        -N
    )
    RUN_CMAKE_COMMAND(GoogleTest-configuration-debug
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -L CONFIG
        -N
    )

ENDFUNCTION()

FUNCTION(run_GoogleTest_discovery_test_list DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-discovery-test-list-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTestDiscoveryTestList -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE})

    RUN_CMAKE_COMMAND(GoogleTest-discovery-test-list-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target test_list_test
    )

    RUN_CMAKE_COMMAND(GoogleTest-discovery-test-list-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_GoogleTest_discovery_flush_script DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-discovery-flush-script-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTestDiscoveryFlushScript -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE})

    RUN_CMAKE_COMMAND(GoogleTest-discovery-flush-script-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target flush_script_test
    )

    RUN_CMAKE_COMMAND(GoogleTest-discovery-flush-script-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_GoogleTest_discovery_test_list_scoped DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-discovery-test-list-scoped-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTestDiscoveryTestListScoped -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE})

    RUN_CMAKE_COMMAND(GoogleTest-discovery-test-list-scoped-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target test_list_scoped_test
    )

    RUN_CMAKE_COMMAND(GoogleTest-discovery-test-list-scoped-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_GoogleTest_discovery_test_list_extra_args DISCOVERY_MODE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-discovery-test-list-extra-args-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE_WITH_OPTIONS(GoogleTestDiscoveryTestListExtraArgs -DCMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE=${DISCOVERY_MODE})

    RUN_CMAKE_COMMAND(GoogleTest-discovery-test-list-extra-args-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target test_list_extra_args
    )

    RUN_CMAKE_COMMAND(GoogleTest-discovery-test-list-extra-args-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        --no-label-summary
    )
ENDFUNCTION()

FUNCTION(run_GoogleTest_LegacyParser)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTestLegacyParser-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    SET(ENV{NO_GTEST_JSON_OUTPUT} 1)

    RUN_CMAKE(GoogleTestLegacyParser)

    RUN_CMAKE_COMMAND(GoogleTestLegacyParser-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target fake_gtest
    )

    SET(RunCMake-stdout-file GoogleTest-test1-stdout.txt)
    RUN_CMAKE_COMMAND(GoogleTestLegacyParser-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        --no-label-summary
    )

    UNSET(ENV{NO_GTEST_JSON_OUTPUT})
ENDFUNCTION()

FUNCTION(run_GoogleTest_DEF_SOURCE_LINE)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/GoogleTest-DEF_SOURCE_LINE-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE(GoogleTestDefSourceLine)

    RUN_CMAKE_COMMAND(GoogleTest-DEF_SOURCE_LINE-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target fake_gtest
    )
    RUN_CMAKE_COMMAND(GoogleTest-DEF_SOURCE_LINE
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        -R "^basic\\.case_"
        --show-only=json-v1
    )
ENDFUNCTION()

FOREACH (DISCOVERY_MODE POST_BUILD PRE_TEST)
    MESSAGE(STATUS "Testing ${DISCOVERY_MODE} discovery mode via CMAKE_GTEST_DISCOVER_TESTS_DISCOVERY_MODE global override...")
    RUN_GOOGLETEST(${DISCOVERY_MODE})
    RUN_GOOGLETESTXML(${DISCOVERY_MODE})
    RUN_LAUNCHER_CMP0178(${DISCOVERY_MODE} NEW)
    RUN_LAUNCHER_CMP0178(${DISCOVERY_MODE} OLD)
    RUN_LAUNCHER_CMP0178(${DISCOVERY_MODE} WARN)
    MESSAGE(STATUS "Testing ${DISCOVERY_MODE} discovery mode via DISCOVERY_MODE option...")
    RUN_GOOGLETEST_DISCOVERY_TIMEOUT(${DISCOVERY_MODE})
    RUN_GOOGLETEST_DISCOVERY_ARG_CHANGE(${DISCOVERY_MODE})
    RUN_GOOGLETEST_DISCOVERY_TEST_LIST(${DISCOVERY_MODE})
    RUN_GOOGLETEST_DISCOVERY_TEST_LIST_SCOPED(${DISCOVERY_MODE})
    RUN_GOOGLETEST_DISCOVERY_TEST_LIST_EXTRA_ARGS(${DISCOVERY_MODE})
    RUN_GOOGLETEST_DISCOVERY_FLUSH_SCRIPT(${DISCOVERY_MODE})
ENDFOREACH ()

IF (RunCMake_GENERATOR_IS_MULTI_CONFIG)
    MESSAGE(STATUS "Testing PRE_TEST discovery multi configuration...")
    RUN_GOOGLETEST_DISCOVERY_MULTI_CONFIG()
ENDIF ()

BLOCK(SCOPE_FOR VARIABLES)
    # Use a single build tree for a few tests without cleaning.
    SET(RunCMake_TEST_BINARY_DIR ${RunCMake_BINARY_DIR}/WorkDirWithSpaces-build)
    SET(RunCMake_TEST_NO_CLEAN 1)
    IF (NOT RunCMake_GENERATOR_IS_MULTI_CONFIG)
        SET(RunCMake_TEST_OPTIONS -DCMAKE_BUILD_TYPE=Debug)
    ENDIF ()
    FILE(REMOVE_RECURSE "${RunCMake_TEST_BINARY_DIR}")
    FILE(MAKE_DIRECTORY "${RunCMake_TEST_BINARY_DIR}")

    RUN_CMAKE(WorkDirWithSpaces)

    RUN_CMAKE_COMMAND(WorkDirWithSpaces-build
        ${CMAKE_COMMAND}
        --build .
        --config Debug
        --target test_workdir
    )

    RUN_CMAKE_COMMAND(WorkDirWithSpaces-test
        ${CMAKE_CTEST_COMMAND}
        -C Debug
        --no-label-summary
        --output-on-failure
    )
ENDBLOCK()

RUN_GOOGLETEST_LEGACYPARSER()
RUN_GOOGLETEST_DEF_SOURCE_LINE()
