CMAKE_POLICY(SET CMP0186 NEW)

FUNCTION(check_output name expected)
    SET(output "${${name}}")
    IF (NOT output STREQUAL expected)
        MESSAGE(FATAL_ERROR "\"string(REGEX)\" set ${name} to \"${output}\", expected \"${expected}\"")
    ENDIF ()
ENDFUNCTION()

# Zero-length matches in REGEX MATCH

STRING(REGEX MATCH "" out "")
CHECK_OUTPUT(out "")

STRING(REGEX MATCH "" out "a")
CHECK_OUTPUT(out "")

STRING(REGEX MATCH "a*" out "")
CHECK_OUTPUT(out "")

STRING(REGEX MATCH "a*" out "a")
CHECK_OUTPUT(out "a")

STRING(REGEX MATCH "a*" out "b")
CHECK_OUTPUT(out "")

STRING(REGEX MATCH "a*" out "ba")
CHECK_OUTPUT(out "")

# Zero-length matches in REGEX MATCHALL

STRING(REGEX MATCHALL "" out "")
CHECK_OUTPUT(out "")

STRING(REGEX MATCHALL "" out "ab")
CHECK_OUTPUT(out ";;")

STRING(REGEX MATCHALL "^" out "ab")
CHECK_OUTPUT(out "")

STRING(REGEX MATCHALL "(^|,)" out "a,b")
CHECK_OUTPUT(out ";,")

STRING(REGEX MATCHALL "(,|^)" out "a,b")
CHECK_OUTPUT(out ";,")

STRING(REGEX MATCHALL "(^|)" out "")
CHECK_OUTPUT(out "")

STRING(REGEX MATCHALL "(^|)" out "ab")
CHECK_OUTPUT(out ";;")

STRING(REGEX MATCHALL "a|^" out "ab")
CHECK_OUTPUT(out "a")

STRING(REGEX MATCHALL "$" out "ab")
CHECK_OUTPUT(out "")

STRING(REGEX MATCHALL "($|,)" out "a,b")
CHECK_OUTPUT(out ",;")

STRING(REGEX MATCHALL "(,|$)" out "a,b")
CHECK_OUTPUT(out ",;")

STRING(REGEX MATCHALL "(|$)" out "")
CHECK_OUTPUT(out "")

STRING(REGEX MATCHALL "(|$)" out "ab")
CHECK_OUTPUT(out ";;")

STRING(REGEX MATCHALL "(b|)" out "abc")
CHECK_OUTPUT(out ";b;;")

STRING(REGEX MATCHALL "(|b)" out "abc")
CHECK_OUTPUT(out ";;b;;")

STRING(REGEX MATCHALL "a*" out "aaa")
CHECK_OUTPUT(out "aaa;")

STRING(REGEX MATCHALL "(a)?(b)?" out "")
CHECK_OUTPUT(out "")

STRING(REGEX MATCHALL "(a)?(b)?" out "abba")
CHECK_OUTPUT(out "ab;b;a;")

# Zero-length matches in REGEX REPLACE

STRING(REGEX REPLACE "" "" out "")
CHECK_OUTPUT(out "")

STRING(REGEX REPLACE "" "x" out "")
CHECK_OUTPUT(out "x")

STRING(REGEX REPLACE "" "x" out "ab")
CHECK_OUTPUT(out "xaxbx")

STRING(REGEX REPLACE "^" "x" out "ab")
CHECK_OUTPUT(out "xab")

STRING(REGEX REPLACE "(^|,)" "x" out "a,b")
CHECK_OUTPUT(out "xaxb")

STRING(REGEX REPLACE "(,|^)" "x" out "a,b")
CHECK_OUTPUT(out "xaxb")

STRING(REGEX REPLACE "(^|)" "x" out "")
CHECK_OUTPUT(out "x")

STRING(REGEX REPLACE "(^|)" "x" out "ab")
CHECK_OUTPUT(out "xaxbx")

STRING(REGEX REPLACE "a|^" "x" out "ab")
CHECK_OUTPUT(out "xb")

STRING(REGEX REPLACE "$" "x" out "ab")
CHECK_OUTPUT(out "abx")

STRING(REGEX REPLACE "($|,)" "x" out "a,b")
CHECK_OUTPUT(out "axbx")

STRING(REGEX REPLACE "(,|$)" "x" out "a,b")
CHECK_OUTPUT(out "axbx")

STRING(REGEX REPLACE "(|$)" "x" out "")
CHECK_OUTPUT(out "x")

STRING(REGEX REPLACE "(|$)" "x" out "ab")
CHECK_OUTPUT(out "xaxbx")

STRING(REGEX REPLACE "(b|)" "x" out "abc")
CHECK_OUTPUT(out "xaxxcx")

STRING(REGEX REPLACE "(|b)" "x" out "abc")
CHECK_OUTPUT(out "xaxxxcx")

STRING(REGEX REPLACE "a*" "x" out "aaa")
CHECK_OUTPUT(out "xx")

STRING(REGEX REPLACE "(a)?(b)?" "x" out "")
CHECK_OUTPUT(out "x")

STRING(REGEX REPLACE "(a)?(b)?" "x" out "abba")
CHECK_OUTPUT(out "xxxx")
