
# helper function for test validation
FUNCTION(CHECK query result expression)
    CMAKE_LANGUAGE(EVAL CODE
        "if (NOT (${expression}))
       message(SEND_ERROR \"wrong value for query '${query}': '${result}'\")
     endif()")
ENDFUNCTION()


CMAKE_POLICY(SET CMP0134 NEW)

# HKCU/Software/Classes/CLSID/CMake-Tests/find_program: Query default value
SET(FILE_DIR "[HKCU/Software/Classes/CLSID/CMake-Tests/find_program]")
SET(FILE_DIR2 "[HKCU/Software/Classes/CLSID/CMake-Tests/find_program;(default)]")

UNSET(result)
FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.${ARCH}/file.exe$\"")

# query value using special name should be identical to default value
UNSET(result)
FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR2}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR2}" "${result}" "result MATCHES \"default.${ARCH}/file.exe$\"")

UNSET(result)
FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW HOST REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.${ARCH}/file.exe$\"")
# VIEW TARGET should have same value as VIEW HOST
UNSET(result2)
FIND_PROGRAM(result2 NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW TARGET REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR}" "${result2}" "result2 STREQUAL result")

IF (ARCH STREQUAL "64bit")

    # default view is BOTH so querying any value specific to 32 or 64bit must be found
    UNSET(result)
    FIND_PROGRAM(result NAMES file64bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.64bit/file64bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file32bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file32bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.64bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64_32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.64bit/file.exe$\"")
    UNSET(result)

    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32_64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file.exe$\"")

    # check the second view is taken into account
    UNSET(result)
    FIND_PROGRAM(result NAMES file32bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64_32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file32bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file64bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32_64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.64bit/file64bit.exe$\"")

    # check the both views are taken into account
    UNSET(result)
    FIND_PROGRAM(result NAMES file32bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW BOTH REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file32bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file64bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW BOTH REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.64bit/file64bit.exe$\"")

ELSE () # 32bit

    # no 64bit registry: file not found
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64 NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"result-NOTFOUND$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file.exe$\"")

    # views 64_32 and 32_64 give same result
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64_32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32_64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file.exe$\"")

    # check the both views are usable on 32bit platforms
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW BOTH REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"default.32bit/file.exe$\"")

ENDIF ()

# HKCU/Software/Classes/CLSID/CMake-Tests/find_program: Query specific value
SET(FILE_DIR "[{|}HKCU/Software/Classes/CLSID/CMake-Tests/find_program|FILE_DIR]")
SET(FILE_DIR2 "[HKCU\\Software\\Classes\\CLSID\\CMake-Tests\\find_program;FILE_DIR]")

UNSET(result)
FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/${ARCH}/file.exe$\"")

# query value using special name should be identical to default value
UNSET(result)
FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR2}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR2}" "${result}" "result MATCHES \"/${ARCH}/file.exe$\"")

UNSET(result)
FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW HOST REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/${ARCH}/file.exe$\"")
# VIEW TARGET should have same value as VIEW HOST
UNSET(result2)
FIND_PROGRAM(result2 NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW TARGET REQUIRED NO_CACHE NO_DEFAULT_PATH)
CHECK("${FILE_DIR}" "${result2}" "result2 STREQUAL result")

IF (ARCH STREQUAL "64bit")

    # default view is BOTH so querying any value specific to 32 or 64bit must be found
    UNSET(result)
    FIND_PROGRAM(result NAMES file64bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/64bit/file64bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file32bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file32bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/64bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64_32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/64bit/file.exe$\"")
    UNSET(result)

    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32_64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

    # check the second view is taken into account
    UNSET(result)
    FIND_PROGRAM(result NAMES file32bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64_32 NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file32bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file64bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32_64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/64bit/file64bit.exe$\"")

    # check the both views are taken into account
    UNSET(result)
    FIND_PROGRAM(result NAMES file32bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW BOTH REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file32bit.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file64bit.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW BOTH REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/64bit/file64bit.exe$\"")

ELSE () # 32bit

    # no 64bit registry: file not found
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64 NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"result-NOTFOUND$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 64_32 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW 32_64 REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

    # check the both views are taken into account
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW BOTH REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

ENDIF ()

IF (ARCH STREQUAL "64bit")

    # Check influence of variable CMAKE_SIZEOF_VOID_P
    SET(CMAKE_SIZEOF_VOID_P 8)
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW TARGET REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/64bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW HOST REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/${ARCH}/file.exe$\"")


    SET(CMAKE_SIZEOF_VOID_P 4)
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW TARGET REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" REGISTRY_VIEW HOST REQUIRED NO_CACHE NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/${ARCH}/file.exe$\"")

    UNSET(CMAKE_SIZEOF_VOID_P)


    # Check influence of CMP0134 policy with OLD value
    CMAKE_POLICY(SET CMP0134 OLD)
    # CMAKE_SIZEOF_VOID_P is not set, so search first 32bit registry
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" NO_CACHE REQUIRED NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/32bit/file.exe$\"")

    CMAKE_POLICY(SET CMP0134 NEW)
    # CMAKE_SIZEOF_VOID_P is not set, so search first the HOST architecture registry
    UNSET(result)
    FIND_PROGRAM(result NAMES file.exe PATHS "${CMAKE_CURRENT_SOURCE_DIR}/${FILE_DIR}" NO_CACHE REQUIRED NO_DEFAULT_PATH)
    CHECK("${FILE_DIR}" "${result}" "result MATCHES \"/${ARCH}/file.exe$\"")

ENDIF ()
