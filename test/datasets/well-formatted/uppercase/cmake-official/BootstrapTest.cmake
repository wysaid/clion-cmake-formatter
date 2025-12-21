FILE(MAKE_DIRECTORY "${bin_dir}")
INCLUDE(ProcessorCount)
PROCESSORCOUNT(nproc)
IF (generator MATCHES "Ninja")
    SET(ninja_arg --generator=Ninja)
ENDIF ()
IF (NOT nproc EQUAL 0)
    SET(parallel_arg --parallel=${nproc})
ENDIF ()
MESSAGE(STATUS "running bootstrap: ${bootstrap} ${ninja_arg} ${parallel_arg}")
EXECUTE_PROCESS(
    COMMAND ${bootstrap} ${ninja_arg} ${parallel_arg}
    WORKING_DIRECTORY "${bin_dir}"
    RESULT_VARIABLE result
)
IF (result)
    MESSAGE(FATAL_ERROR "bootstrap failed: ${result}")
ENDIF ()
