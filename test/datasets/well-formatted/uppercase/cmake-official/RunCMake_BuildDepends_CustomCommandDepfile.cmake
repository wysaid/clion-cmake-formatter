SET(CMAKE_INTERMEDIATE_DIR_STRATEGY FULL CACHE STRING "" FORCE)

CMAKE_POLICY(SET CMP0116 NEW)
ENABLE_LANGUAGE(C)

ADD_CUSTOM_COMMAND(
    OUTPUT topcc.c
    DEPFILE topcc_$<CONFIG>.c.d
    COMMAND ${CMAKE_COMMAND} -DOUTFILE=${CMAKE_CURRENT_BINARY_DIR}/topcc.c -DINFILE=topccdep.txt -DDEPFILE=topcc_$<CONFIG>.c.d -P "${CMAKE_CURRENT_LIST_DIR}/WriteDepfile.cmake"
)
ADD_CUSTOM_TARGET(topcc ALL DEPENDS topcc.c)

ADD_CUSTOM_COMMAND(
    OUTPUT topexe.c
    DEPFILE ${CMAKE_CURRENT_BINARY_DIR}/topexe_$<CONFIG>.c.d
    COMMAND ${CMAKE_COMMAND} -DOUTFILE=topexe.c "-DINFILE=${CMAKE_CURRENT_BINARY_DIR}/topexedep.txt" -DDEPFILE=topexe_$<CONFIG>.c.d -P "${CMAKE_CURRENT_LIST_DIR}/WriteDepfile.cmake"
)
ADD_EXECUTABLE(topexe "${CMAKE_CURRENT_BINARY_DIR}/topexe.c")

ADD_CUSTOM_COMMAND(
    OUTPUT toplib.c
    DEPFILE toplib.c.d
    COMMAND ${CMAKE_COMMAND} -DOUTFILE=toplib.c -DINFILE=toplibdep.txt -DDEPFILE=toplib.c.d -P "${CMAKE_CURRENT_LIST_DIR}/WriteDepfile.cmake"
)
ADD_LIBRARY(toplib STATIC toplib.c)

ADD_SUBDIRECTORY(DepfileSubdir)

SET(TEST_SPACE 1)
IF (CMAKE_GENERATOR STREQUAL "Unix Makefiles")
    EXECUTE_PROCESS(COMMAND "${CMAKE_MAKE_PROGRAM}" no_such_target --version RESULT_VARIABLE res OUTPUT_VARIABLE out ERROR_VARIABLE out)
    IF (NOT res EQUAL 0 OR NOT out MATCHES "GNU")
        SET(TEST_SPACE 0)
    ENDIF ()
ENDIF ()
IF (TEST_SPACE)
    ADD_SUBDIRECTORY(DepfileSubdirWithSpace)
ENDIF ()

ADD_CUSTOM_COMMAND(
    OUTPUT toplib2.c
    DEPFILE toplib2.c.d
    COMMAND ${CMAKE_COMMAND} -DOUTFILE=toplib2.c -DINFILE=toplibdep2.txt -DDEPFILE=toplib2.c.d -P "${CMAKE_CURRENT_LIST_DIR}/WriteDepfile2.cmake"
)
ADD_LIBRARY(toplib2 STATIC toplib2.c)

FILE(GENERATE OUTPUT ${CMAKE_CURRENT_BINARY_DIR}/check-$<LOWER_CASE:$<CONFIG>>.cmake CONTENT "
function(check_exists file)
  if(NOT EXISTS \"\${file}\")
    string(APPEND RunCMake_TEST_FAILED \"\${file} does not exist\\n\")
  endif()
  set(RunCMake_TEST_FAILED \"\${RunCMake_TEST_FAILED}\" PARENT_SCOPE)
endfunction()

function(check_not_exists file)
  if(EXISTS \"\${file}\")
    string(APPEND RunCMake_TEST_FAILED \"\${file} exists\\n\")
  endif()
  set(RunCMake_TEST_FAILED \"\${RunCMake_TEST_FAILED}\" PARENT_SCOPE)
endfunction()

set(check_pairs
  \"${CMAKE_BINARY_DIR}/topcc.c|${CMAKE_BINARY_DIR}/topccdep.txt\"
  \"$<TARGET_FILE:topexe>|${CMAKE_BINARY_DIR}/topexedep.txt\"
  \"$<TARGET_FILE:toplib>|${CMAKE_BINARY_DIR}/toplibdep.txt\"
  \"$<TARGET_FILE:toplib2>|${CMAKE_BINARY_DIR}/toplibdep2.txt\"
  \"${CMAKE_BINARY_DIR}/DepfileSubdir/subcc.c|${CMAKE_BINARY_DIR}/DepfileSubdir/subccdep.txt\"
  \"$<TARGET_FILE:subexe>|${CMAKE_BINARY_DIR}/DepfileSubdir/subexedep.txt\"
  \"$<TARGET_FILE:sublib>|${CMAKE_BINARY_DIR}/DepfileSubdir/sublibdep.txt\"
  )

if(check_step EQUAL 3)
  list(APPEND check_pairs
    \"${CMAKE_BINARY_DIR}/step3.timestamp|${CMAKE_BINARY_DIR}/topcc.c\"
    \"${CMAKE_BINARY_DIR}/step3.timestamp|$<TARGET_FILE:topexe>\"
    \"${CMAKE_BINARY_DIR}/step3.timestamp|$<TARGET_FILE:toplib>\"
    \"${CMAKE_BINARY_DIR}/step3.timestamp|$<TARGET_FILE:toplib2>\"
    \"${CMAKE_BINARY_DIR}/step3.timestamp|${CMAKE_BINARY_DIR}/DepfileSubdir/subcc.c\"
    \"${CMAKE_BINARY_DIR}/step3.timestamp|$<TARGET_FILE:subexe>\"
    \"${CMAKE_BINARY_DIR}/step3.timestamp|$<TARGET_FILE:sublib>\"
    )

  if (RunCMake_GENERATOR MATCHES \"Make\")
    file(STRINGS \"${CMAKE_BINARY_DIR}/CMakeFiles/topcc.dir/compiler_depend.internal\" deps REGEX \"^.*topccdep\\\\.txt$\")
    list(LENGTH deps count)
    if (NOT count EQUAL 1)
       string(APPEND RunCMake_TEST_FAILED \"dependencies are duplicated\\n\")
       set(RunCMake_TEST_FAILED \"\${RunCMake_TEST_FAILED}\" PARENT_SCOPE)
    endif()
  endif()
endif()
")
