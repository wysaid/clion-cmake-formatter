SET(failure_test_executables
    ${CMAKE_CURRENT_BINARY_DIR}/failure_test_targets)
FILE(WRITE ${failure_test_executables} "")

# Check if we should do anything. If the compiler doesn't support hidden
# visibility, the failure tests won't fail, so just write an empty targets
# list and punt.
IF (NOT WIN32 AND NOT CYGWIN AND NOT COMPILER_HAS_HIDDEN_VISIBILITY)
    RETURN()
ENDIF ()

# Read the input source file
FILE(READ ${CMAKE_CURRENT_SOURCE_DIR}/exportheader_test.cpp content_post)
SET(content_pre "")

# Generate source files for failure test executables
SET(counter 0)
WHILE (1)
    # Find first occurrence of link error marker in remaining content
    STRING(REGEX MATCH "//([^;\n]+;) LINK ERROR( [(][^)]+[)])?\n(.*)"
        match "${content_post}")
    IF (match STREQUAL "")
        # No more matches
        BREAK ()
    ENDIF ()

    # Shift content buffers and extract failing statement
    STRING(LENGTH "${content_post}" content_post_length)
    STRING(LENGTH "${match}" matched_length)
    MATH(EXPR shift_length "${content_post_length} - ${matched_length}")

    STRING(SUBSTRING "${content_post}" 0 ${shift_length} shift)
    SET(content_pre "${content_pre}${shift}")
    SET(content_post "${CMAKE_MATCH_3}")
    SET(content_active "//${CMAKE_MATCH_1} LINK ERROR${CMAKE_MATCH_2}")
    SET(statement "${CMAKE_MATCH_1}")

    # Check if potential error is conditional, and evaluate condition if so
    STRING(REGEX REPLACE " [(]([^)]+)[)]" "\\1" condition "${CMAKE_MATCH_2}")
    IF (NOT condition STREQUAL "")
        STRING(REGEX REPLACE " +" ";" condition "${condition}")
        IF (${condition})
        ELSE ()
            MESSAGE(STATUS "Not testing '${statement}'; "
                "condition (${condition}) is FALSE")
            SET(content_pre "${content_pre}// link error removed\n")
            CONTINUE ()
        ENDIF ()
    ENDIF ()

    IF (NOT skip)
        MESSAGE(STATUS "Creating failure test for '${statement}'")
        MATH(EXPR counter "${counter} + 1")

        # Write new source file
        SET(out ${CMAKE_CURRENT_BINARY_DIR}/exportheader_failtest-${counter}.cpp)
        FILE(WRITE ${out} "${content_pre}${statement}\n${content_post}")

        # Add executable for failure test
        ADD_EXECUTABLE(GEH-fail-${counter} EXCLUDE_FROM_ALL ${out})
        TARGET_LINK_LIBRARIES(GEH-fail-${counter} ${link_libraries})
        FILE(APPEND ${failure_test_executables} "GEH-fail-${counter}\n")
    ENDIF ()

    # Add placeholder where failing statement was removed
    SET(content_pre "${content_pre}${content_active}\n")
ENDWHILE ()
