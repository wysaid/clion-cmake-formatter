# a simple CXX only test case
CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(Properties)

# these first three tests really test both properties and the management of
# cmSourceFile objects by CMake.

# test properties on a build tree file that is relative (yuck)
CONFIGURE_FILE(properties.h.in "${Properties_BINARY_DIR}/properties.h")
SET_SOURCE_FILES_PROPERTIES(properties.h PROPERTIES TEST1 1)
GET_SOURCE_FILE_PROPERTY(RESULT1 properties.h TEST1)

# test properties on a headerfile in the source tree
# accessed without an extension (also yuck)
SET_SOURCE_FILES_PROPERTIES(properties2 PROPERTIES TEST2 1)
GET_SOURCE_FILE_PROPERTY(RESULT2 properties2 TEST2)

# test properties on a relative source that is not generated
SET_SOURCE_FILES_PROPERTIES(SubDir/properties3.cxx PROPERTIES TEST3 1)
GET_SOURCE_FILE_PROPERTY(RESULT3 SubDir/properties3.cxx TEST3)

INCLUDE_DIRECTORIES("${Properties_SOURCE_DIR}" "${Properties_BINARY_DIR}")


# test generic property interfaces
GET_PROPERTY(GLOBALRESULT GLOBAL PROPERTY GLOBALTEST DEFINED)
IF (GLOBALRESULT)
    MESSAGE(SEND_ERROR "Error: global prop defined when it should not be, "
        "result is GLOBALRESULT=${GLOBALRESULT}")
ENDIF ()

DEFINE_PROPERTY(GLOBAL PROPERTY GLOBALTEST
    BRIEF_DOCS "A test property"
    FULL_DOCS "A long description of this test property"
)

GET_PROPERTY(GLOBALRESULT GLOBAL PROPERTY GLOBALTEST DEFINED)
IF (NOT GLOBALRESULT)
    MESSAGE(SEND_ERROR "Error: global prop not defined "
        "result is GLOBALRESULT=${GLOBALRESULT}")
ENDIF ()

SET_PROPERTY(GLOBAL PROPERTY GLOBALTEST 1)
SET_PROPERTY(DIRECTORY PROPERTY DIRECTORYTEST 1)
SET_PROPERTY(SOURCE SubDir/properties3.cxx PROPERTY SOURCETEST 1)
GET_PROPERTY(GLOBALRESULT GLOBAL PROPERTY GLOBALTEST)
GET_PROPERTY(DIRECTORYRESULT DIRECTORY PROPERTY DIRECTORYTEST)
GET_PROPERTY(SOURCERESULT
    SOURCE SubDir/properties3.cxx
    PROPERTY SOURCETEST
)

IF (RESULT1 AND RESULT2 AND RESULT3 AND GLOBALRESULT AND
    DIRECTORYRESULT AND SOURCERESULT)
    ADD_EXECUTABLE(Properties SubDir/properties3.cxx properties)
ELSE ()
    MESSAGE(SEND_ERROR
        "Error: test results are RESULT1=${RESULT1} RESULT2=${RESULT2} "
        "RESULT3=${RESULT3} GLOBALRESULT=${GLOBALRESULT} "
        "DIRECTORYRESULT=${DIRECTORYRESULT} "
        "SOURCERESULT=${SOURCERESULT}")
ENDIF ()

# test the target property
SET_PROPERTY(TARGET Properties PROPERTY TARGETTEST 1)
GET_PROPERTY(TARGETRESULT TARGET Properties PROPERTY TARGETTEST)
IF (NOT TARGETRESULT)
    MESSAGE(SEND_ERROR
        "Error: target result is TARGETRESULT=${TARGETRESULT}")
ENDIF ()

# test APPEND and APPEND_STRING set_property()
SET_PROPERTY(TARGET Properties PROPERTY FOO foo)
SET_PROPERTY(TARGET Properties PROPERTY BAR bar)
SET_PROPERTY(TARGET Properties APPEND PROPERTY FOO 123)
SET_PROPERTY(TARGET Properties APPEND_STRING PROPERTY BAR 456)

GET_PROPERTY(APPEND_RESULT TARGET Properties PROPERTY FOO)
IF (NOT "${APPEND_RESULT}" STREQUAL "foo;123")
    MESSAGE(SEND_ERROR
        "Error: target result is APPEND_RESULT=${APPEND_RESULT}")
ENDIF ()

GET_PROPERTY(APPEND_STRING_RESULT TARGET Properties PROPERTY BAR)
IF (NOT "${APPEND_STRING_RESULT}" STREQUAL "bar456")
    MESSAGE(SEND_ERROR
        "Error: target result is APPEND_STRING_RESULT=${APPEND_STRING_RESULT}")
ENDIF ()

# test get_property SET
GET_PROPERTY(TARGETRESULT TARGET Properties PROPERTY TARGETTEST SET)
IF (NOT TARGETRESULT)
    MESSAGE(SEND_ERROR
        "Error: target prop not set, result is TARGETRESULT=${TARGETRESULT}")
ENDIF ()

# test unsetting a property
SET_PROPERTY(TARGET Properties PROPERTY TARGETTEST)
GET_PROPERTY(TARGETRESULT TARGET Properties PROPERTY TARGETTEST SET)
IF (TARGETRESULT)
    MESSAGE(SEND_ERROR "Error: target prop not unset, "
        "result is TARGETRESULT=${TARGETRESULT}")
ENDIF ()


# test the target SOURCES property
GET_PROPERTY(Properties_SOURCES TARGET Properties PROPERTY SOURCES)
SET_SOURCE_FILES_PROPERTIES(${Properties_SOURCES} PROPERTIES TEST4 1)
GET_SOURCE_FILE_PROPERTY(RESULT4 properties.h TEST4)
IF (NOT RESULT4)
    MESSAGE(SEND_ERROR "Error: target result is"
        " RESULT4=${RESULT4}"
        " Properties_SOURCES=[${Properties_SOURCES}]")
ENDIF ()

# test CACHE properties
MACRO(check_cache_props)
    FOREACH (prop VALUE TYPE HELPSTRING ADVANCED STRINGS)
        GET_PROPERTY(result CACHE SOME_ENTRY PROPERTY ${prop})
        IF (NOT "x${result}" STREQUAL "x${expect_${prop}}")
            MESSAGE(SEND_ERROR "CACHE property ${prop} is [${result}], not [${expect_${prop}}]")
        ENDIF ()
    ENDFOREACH ()
ENDMACRO()
SET(expect_VALUE "ON")
SET(expect_TYPE "BOOL")
SET(expect_HELPSTRING "sample cache entry")
SET(expect_ADVANCED 0)
SET(expect_STRINGS "")
SET(SOME_ENTRY "${expect_VALUE}" CACHE ${expect_TYPE} "${expect_HELPSTRING}" FORCE)
MARK_AS_ADVANCED(CLEAR SOME_ENTRY)
SET_PROPERTY(CACHE SOME_ENTRY PROPERTY STRINGS "")
CHECK_CACHE_PROPS()
SET(expect_VALUE "Some string")
SET(expect_TYPE "STRING")
SET(expect_HELPSTRING "sample cache entry help")
SET(expect_ADVANCED 1)
SET(expect_STRINGS "Some string;Some other string;Some third string")
SET_PROPERTY(CACHE SOME_ENTRY PROPERTY TYPE "${expect_TYPE}")
SET_PROPERTY(CACHE SOME_ENTRY PROPERTY HELPSTRING "${expect_HELPSTRING}")
SET_PROPERTY(CACHE SOME_ENTRY PROPERTY VALUE "${expect_VALUE}")
SET_PROPERTY(CACHE SOME_ENTRY PROPERTY ADVANCED "${expect_ADVANCED}")
SET_PROPERTY(CACHE SOME_ENTRY PROPERTY STRINGS "${expect_STRINGS}")
CHECK_CACHE_PROPS()

FUNCTION(generate_file_for_set_property_test i target_name)
    SET(src_path "${CMAKE_CURRENT_BINARY_DIR}/src${i}.cpp")
    FILE(CONFIGURE OUTPUT "${src_path}" CONTENT
        "#ifndef def${i}\n\
        #error Expected def${i}\n\
        #endif\n\
        #ifdef _WIN32\n\
        __declspec(dllexport)\n\
        #endif\n\
        void dummy_symbol${i}() {}\n"
        NEWLINE_STYLE UNIX)
    TARGET_SOURCES(${target_name} PRIVATE "${src_path}")
ENDFUNCTION()

ADD_LIBRARY(maindirtest SHARED)

# Generate file to be used with both DIRECTORY and TARGET_DIRECTORY options in
# set_source_files_properties and set_property().
GENERATE_FILE_FOR_SET_PROPERTY_TEST(32 maindirtest)
GENERATE_FILE_FOR_SET_PROPERTY_TEST(33 maindirtest)

# Set/get properties by binary directory path.
ADD_SUBDIRECTORY(SubDir SubDirA)
GET_PROPERTY(dir_prop_top DIRECTORY PROPERTY dir_prop_top)
IF (NOT dir_prop_top STREQUAL "${CMAKE_CURRENT_BINARY_DIR}/SubDirA")
    MESSAGE(SEND_ERROR "dir_prop_top unexpected value after SubDirA:\n ${dir_prop_top}")
ENDIF ()
ADD_SUBDIRECTORY(SubDir SubDirB)
GET_PROPERTY(dir_prop_top DIRECTORY PROPERTY dir_prop_top)
IF (NOT dir_prop_top STREQUAL "${CMAKE_CURRENT_BINARY_DIR}/SubDirB")
    MESSAGE(SEND_ERROR "dir_prop_top unexpected value after SubDirB:\n ${dir_prop_top}")
ENDIF ()
GET_PROPERTY(dir_prop_subA DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/SubDirA PROPERTY dir_prop_sub)
IF (NOT dir_prop_subA STREQUAL "${CMAKE_CURRENT_BINARY_DIR}/SubDirA")
    MESSAGE(SEND_ERROR "SubDirA property dir_prop_sub incorrect:\n ${dir_prop_subA}")
ENDIF ()
GET_PROPERTY(dir_prop_subB DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/SubDirB PROPERTY dir_prop_sub)
IF (NOT dir_prop_subB STREQUAL "${CMAKE_CURRENT_BINARY_DIR}/SubDirB")
    MESSAGE(SEND_ERROR "SubDirB property dir_prop_sub incorrect:\n ${dir_prop_subB}")
ENDIF ()
GET_DIRECTORY_PROPERTY(dir_prop_subA DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/SubDirA dir_prop_sub)
IF (NOT dir_prop_subA STREQUAL "${CMAKE_CURRENT_BINARY_DIR}/SubDirA")
    MESSAGE(SEND_ERROR "SubDirA property dir_prop_sub incorrect:\n ${dir_prop_subA}")
ENDIF ()
GET_DIRECTORY_PROPERTY(dir_prop_subB DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/SubDirB dir_prop_sub)
IF (NOT dir_prop_subB STREQUAL "${CMAKE_CURRENT_BINARY_DIR}/SubDirB")
    MESSAGE(SEND_ERROR "SubDirB property dir_prop_sub incorrect:\n ${dir_prop_subB}")
ENDIF ()

ADD_SUBDIRECTORY(SubDir2)

SET(src_prefix "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/")

# Set property + target directory
SET_PROPERTY(SOURCE "${src_prefix}/src1.cpp"
    TARGET_DIRECTORY set_prop_lib_1
    PROPERTY COMPILE_DEFINITIONS def1)

# Append property + target directory
SET_PROPERTY(SOURCE "${src_prefix}/src2.cpp"
    TARGET_DIRECTORY set_prop_lib_1
    APPEND PROPERTY COMPILE_DEFINITIONS def2)

# Set property + relative directory path
SET_PROPERTY(SOURCE "${src_prefix}/src3.cpp"
    DIRECTORY SubDir2
    PROPERTY COMPILE_DEFINITIONS def3)

# Set property + absolute directory path
SET_PROPERTY(SOURCE "${src_prefix}/src4.cpp"
    DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/SubDir2"
    PROPERTY COMPILE_DEFINITIONS def4)

# Append property + relative directory path
SET_PROPERTY(SOURCE "${src_prefix}/src5.cpp"
    DIRECTORY SubDir2
    APPEND PROPERTY COMPILE_DEFINITIONS def5)

# Append property + absolute directory path
SET_PROPERTY(SOURCE "${src_prefix}/src6.cpp"
    DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/SubDir2"
    APPEND PROPERTY COMPILE_DEFINITIONS def6)


# Target directory
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src10.cpp"
    TARGET_DIRECTORY set_prop_lib_1
    PROPERTIES COMPILE_DEFINITIONS def10)

# Relative directory path
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src11.cpp"
    DIRECTORY SubDir2
    PROPERTIES COMPILE_DEFINITIONS def11)

# Absolute directory path
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src12.cpp"
    DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/SubDir2"
    PROPERTIES COMPILE_DEFINITIONS def12)


# Multiple files + absolute directory path
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src20.cpp"
    "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src21.cpp"
    DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/SubDir2"
    PROPERTIES COMPILE_DEFINITIONS "def20;def21")

# Multiple files + multiple target directories
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src22.cpp"
    "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src23.cpp"
    TARGET_DIRECTORY set_prop_lib_2 set_prop_lib_3
    PROPERTIES COMPILE_DEFINITIONS "def22;def23")


# Multiple files in multiple relative directories
GENERATE_FILE_FOR_SET_PROPERTY_TEST(30 maindirtest)
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/src30.cpp"
    "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src31.cpp"
    DIRECTORY . SubDir2
    PROPERTIES COMPILE_DEFINITIONS "def30;def31")

# Check that specifying files without any properties doesn't crash.
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/src30.cpp"
    "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src31.cpp")


# Check that specifying both DIRECTORY and TARGET_DIRECTORY works.
SET_SOURCE_FILES_PROPERTIES("${CMAKE_CURRENT_BINARY_DIR}/src32.cpp"
    DIRECTORY .
    TARGET_DIRECTORY set_prop_lib_3
    PROPERTIES COMPILE_DEFINITIONS "def32")

SET_PROPERTY(SOURCE "${CMAKE_CURRENT_BINARY_DIR}/src33.cpp"
    DIRECTORY SubDir2
    TARGET_DIRECTORY maindirtest
    PROPERTY COMPILE_DEFINITIONS "def33")


FUNCTION(check_get_property_value expected)
    IF (NOT actual STREQUAL expected)
        MESSAGE(SEND_ERROR "Error: get_property returned unexpected value\n"
            "actual: ${actual}\n"
            "expected: ${expected}")
    ENDIF ()
ENDFUNCTION()

# Check that source file directory scopes are deduplicated.
SET_PROPERTY(SOURCE "${CMAKE_CURRENT_BINARY_DIR}/src32.cpp"
    DIRECTORY SubDir2 SubDir2 SubDir2
    TARGET_DIRECTORY set_prop_lib_3 set_prop_lib_3 set_prop_lib_3
    APPEND
    PROPERTY NON_DUPLICATED_CUSTOM_PROP 1
)

GET_PROPERTY(actual
    SOURCE "${CMAKE_CURRENT_BINARY_DIR}/src32.cpp"
    DIRECTORY SubDir2
    PROPERTY NON_DUPLICATED_CUSTOM_PROP)
CHECK_GET_PROPERTY_VALUE("1")

GET_SOURCE_FILE_PROPERTY(actual "${CMAKE_CURRENT_BINARY_DIR}/src32.cpp"
    TARGET_DIRECTORY set_prop_lib_3
    NON_DUPLICATED_CUSTOM_PROP)
CHECK_GET_PROPERTY_VALUE("1")

# Get property + target directory
GET_PROPERTY(actual
    SOURCE "${src_prefix}/src1.cpp"
    TARGET_DIRECTORY set_prop_lib_1
    PROPERTY COMPILE_DEFINITIONS)
CHECK_GET_PROPERTY_VALUE("def1")

# Get property + relative directory path
GET_PROPERTY(actual
    SOURCE "${src_prefix}/src3.cpp"
    DIRECTORY SubDir2
    PROPERTY COMPILE_DEFINITIONS)
CHECK_GET_PROPERTY_VALUE("def3")

# Get property + absolute directory path
GET_PROPERTY(actual
    SOURCE "${src_prefix}/src4.cpp"
    DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/SubDir2"
    PROPERTY COMPILE_DEFINITIONS)
CHECK_GET_PROPERTY_VALUE("def4")


# Get property + target directory
UNSET(actual)
GET_SOURCE_FILE_PROPERTY(actual
    "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src10.cpp"
    TARGET_DIRECTORY set_prop_lib_1
    COMPILE_DEFINITIONS)
CHECK_GET_PROPERTY_VALUE("def10")

# Get property + relative directory path
GET_SOURCE_FILE_PROPERTY(actual
    "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src11.cpp"
    DIRECTORY SubDir2
    COMPILE_DEFINITIONS)
CHECK_GET_PROPERTY_VALUE("def11")

# Get property + absolute directory path
GET_SOURCE_FILE_PROPERTY(actual
    "${CMAKE_CURRENT_BINARY_DIR}/SubDir2/src12.cpp"
    DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/SubDir2"
    COMPILE_DEFINITIONS)
CHECK_GET_PROPERTY_VALUE("def12")
