ENABLE_LANGUAGE(C)

FIND_PACKAGE(foo REQUIRED CONFIG NO_DEFAULT_PATH)

ADD_EXECUTABLE(main main.c)
TARGET_LINK_LIBRARIES(main PRIVATE foo-install::foo)

GET_PROPERTY(enable_exports TARGET foo-install::foo PROPERTY ENABLE_EXPORTS)
IF (CMAKE_TAPI AND NOT enable_exports)
    MESSAGE(SEND_ERROR "foo-install::foo: ENABLE_EXPORTS not set.")
ENDIF ()

GET_PROPERTY(implib TARGET foo-install::foo PROPERTY IMPORTED_IMPLIB_RELEASE)
IF (CMAKE_TAPI AND NOT implib)
    MESSAGE(SEND_ERROR "foo-install::foo: IMPORTED_IMPLIB_RELEASE not set.")
ENDIF ()
IF (CMAKE_TAPI AND NOT implib MATCHES "Release/libfoo.tbd$")
    MESSAGE(SEND_ERROR "foo-install::foo: ${implib}: wrong value for IMPORTED_IMPLIB_RELEASE.")
ENDIF ()

GET_PROPERTY(location TARGET foo-install::foo PROPERTY IMPORTED_LOCATION_RELEASE)
IF (NOT location)
    MESSAGE(SEND_ERROR "foo-install::foo: IMPORTED_LOCATION_RELEASE not set.")
ENDIF ()
IF (NOT location MATCHES "Release/libfoo.dylib$")
    MESSAGE(SEND_ERROR "foo-install::foo: ${location}: wrong value for IMPORTED_LOCATION_RELEASE.")
ENDIF ()


INCLUDE(${foo_BUILD}/foo.cmake)

ADD_EXECUTABLE(main2 main.c)
TARGET_LINK_LIBRARIES(main2 PRIVATE foo-build::foo)

GET_PROPERTY(enable_exports TARGET foo-build::foo PROPERTY ENABLE_EXPORTS)
IF (CMAKE_TAPI AND NOT enable_exports)
    MESSAGE(SEND_ERROR "foo-build::foo: ENABLE_EXPORTS not set.")
ENDIF ()

GET_PROPERTY(implib TARGET foo-build::foo PROPERTY IMPORTED_IMPLIB_RELEASE)
IF (CMAKE_TAPI AND NOT implib)
    MESSAGE(SEND_ERROR "foo-build::foo: IMPORTED_IMPLIB_RELEASE not set.")
ENDIF ()
IF (CMAKE_TAPI AND NOT implib STREQUAL "${foo_BUILD}/libfoo.tbd")
    MESSAGE(SEND_ERROR "foo-build::foo: ${implib}: wrong value for IMPORTED_IMPLIB_RELEASE.")
ENDIF ()

GET_PROPERTY(location TARGET foo-build::foo PROPERTY IMPORTED_LOCATION_RELEASE)
IF (NOT location)
    MESSAGE(SEND_ERROR "foo-build::foo: IMPORTED_LOCATION_RELEASE not set.")
ENDIF ()
IF (NOT location STREQUAL "${foo_BUILD}/libfoo.dylib")
    MESSAGE(SEND_ERROR "foo-build::foo: ${location}: wrong value for IMPORTED_LOCATION_RELEASE.")
ENDIF ()
