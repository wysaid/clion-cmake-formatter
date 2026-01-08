# ============================================================================
# LibSVM Test Suite
# ============================================================================

# Testing Options
option(LIBSVM_ENABLE_ASAN "Enable AddressSanitizer for memory error detection" OFF)
option(LIBSVM_ENABLE_UBSAN "Enable UndefinedBehaviorSanitizer for undefined behavior detection" OFF)

include(FetchContent)

# ============================================================================
# Google Test Framework
# ============================================================================

FetchContent_Declare(
    googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.14.0
)

# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
FetchContent_MakeAvailable(googletest)

enable_testing()
include(GoogleTest)

# ============================================================================
# Test Data
# ============================================================================

set(TEST_DATA_DIR "${CMAKE_CURRENT_BINARY_DIR}/data")

# Copy test data to build directory
file(COPY ${CMAKE_SOURCE_DIR}/examples/data/heart_scale
     DESTINATION ${CMAKE_CURRENT_BINARY_DIR}/data)

# ============================================================================
# Unit Tests
# ============================================================================

add_executable(unit_tests
    unit/test_svm_node.cpp
    unit/test_svm_parameter.cpp
    unit/test_svm_problem.cpp
    unit/test_kernel.cpp
    unit/test_model.cpp
    common/test_utils.cpp
)

target_include_directories(unit_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/common
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(unit_tests PRIVATE
    svm
    GTest::gtest
    GTest::gtest_main
)

target_compile_definitions(unit_tests PRIVATE
    TEST_DATA_DIR="${TEST_DATA_DIR}"
)

# Enable sanitizers for unit tests
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    if(LIBSVM_ENABLE_ASAN)
        target_compile_options(unit_tests PRIVATE -fsanitize=address -fno-omit-frame-pointer -g)
        target_link_options(unit_tests PRIVATE -fsanitize=address)
    endif()
    if(LIBSVM_ENABLE_UBSAN)
        target_compile_options(unit_tests PRIVATE -fsanitize=undefined -fno-omit-frame-pointer -g)
        target_link_options(unit_tests PRIVATE -fsanitize=undefined)
    endif()
endif()

gtest_discover_tests(unit_tests)

# ============================================================================
# Integration Tests
# ============================================================================

add_executable(integration_tests
    integration/test_train_predict.cpp
    integration/test_cross_validation.cpp
    integration/test_model_io.cpp
    integration/test_probability.cpp
    common/test_utils.cpp
)

target_include_directories(integration_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/common
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(integration_tests PRIVATE
    svm
    GTest::gtest
    GTest::gtest_main
)

target_compile_definitions(integration_tests PRIVATE
    TEST_DATA_DIR="${CMAKE_CURRENT_BINARY_DIR}/data"
)

# Enable sanitizers for integration tests
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    if(LIBSVM_ENABLE_ASAN)
        target_compile_options(integration_tests PRIVATE -fsanitize=address -fno-omit-frame-pointer -g)
        target_link_options(integration_tests PRIVATE -fsanitize=address)
    endif()
    if(LIBSVM_ENABLE_UBSAN)
        target_compile_options(integration_tests PRIVATE -fsanitize=undefined -fno-omit-frame-pointer -g)
        target_link_options(integration_tests PRIVATE -fsanitize=undefined)
    endif()
endif()

gtest_discover_tests(integration_tests)

# ============================================================================
# Memory Tests (with AddressSanitizer/Valgrind support)
# ============================================================================

add_executable(memory_tests
    memory/test_memory_leaks.cpp
    memory/test_resource_management.cpp
    common/test_utils.cpp
)

target_include_directories(memory_tests PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/common
    ${CMAKE_SOURCE_DIR}/src
)

target_link_libraries(memory_tests PRIVATE
    svm
    GTest::gtest
    GTest::gtest_main
)

target_compile_definitions(memory_tests PRIVATE
    TEST_DATA_DIR="${CMAKE_CURRENT_BINARY_DIR}/data"
)

# Memory tests should ALWAYS use sanitizers when available
if(CMAKE_CXX_COMPILER_ID MATCHES "GNU|Clang")
    if(LIBSVM_ENABLE_ASAN)
        target_compile_options(memory_tests PRIVATE -fsanitize=address -fno-omit-frame-pointer -g)
        target_link_options(memory_tests PRIVATE -fsanitize=address)
        message(STATUS "Memory tests: AddressSanitizer enabled")
    else()
        message(WARNING "Memory tests: AddressSanitizer NOT enabled - some issues may not be detected")
    endif()
    if(LIBSVM_ENABLE_UBSAN)
        target_compile_options(memory_tests PRIVATE -fsanitize=undefined -fno-omit-frame-pointer -g)
        target_link_options(memory_tests PRIVATE -fsanitize=undefined)
        message(STATUS "Memory tests: UndefinedBehaviorSanitizer enabled")
    endif()
endif()

gtest_discover_tests(memory_tests)

# ============================================================================
# Upstream Comparison Tests
# ============================================================================
# These tests compare output between current fork and upstream libsvm
# by building and running separate executables for each version

option(LIBSVM_BUILD_UPSTREAM_COMPARISON "Build upstream LibSVM comparison tests" OFF)

if(LIBSVM_BUILD_UPSTREAM_COMPARISON)
    # Upstream build directory (populated by scripts/run_tests.sh)
    set(UPSTREAM_BUILD_DIR "${CMAKE_BINARY_DIR}/upstream_build")
    set(UPSTREAM_INSTALL_DIR "${UPSTREAM_BUILD_DIR}/install")
    
    # Check if upstream library and headers are available
    if(EXISTS "${UPSTREAM_INSTALL_DIR}/lib/libsvm.a" AND 
       EXISTS "${UPSTREAM_INSTALL_DIR}/include/svm.h")
        message(STATUS "Building upstream comparison tests")
        message(STATUS "  Upstream lib: ${UPSTREAM_INSTALL_DIR}/lib/libsvm.a")
        message(STATUS "  Upstream include: ${UPSTREAM_INSTALL_DIR}/include")
        
        # Import upstream library
        add_library(svm_upstream STATIC IMPORTED)
        set_target_properties(svm_upstream PROPERTIES
            IMPORTED_LOCATION "${UPSTREAM_INSTALL_DIR}/lib/libsvm.a"
            INTERFACE_INCLUDE_DIRECTORIES "${UPSTREAM_INSTALL_DIR}/include"
        )
        
        # Get all test case source files
        file(GLOB COMPARISON_TEST_SOURCES 
            "${CMAKE_CURRENT_SOURCE_DIR}/comparison/test_cases/*.cpp")
        
        foreach(TEST_SOURCE ${COMPARISON_TEST_SOURCES})
            get_filename_component(TEST_NAME ${TEST_SOURCE} NAME_WE)
            
            # Build current version executable
            add_executable(compare_current_${TEST_NAME}
                ${TEST_SOURCE}
            )
            target_link_libraries(compare_current_${TEST_NAME} PRIVATE svm)
            target_include_directories(compare_current_${TEST_NAME} PRIVATE
                ${CMAKE_SOURCE_DIR}/src
            )
            set_target_properties(compare_current_${TEST_NAME} PROPERTIES
                RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin/comparison"
            )
            
            # Build upstream version executable
            add_executable(compare_upstream_${TEST_NAME}
                ${TEST_SOURCE}
            )
            target_link_libraries(compare_upstream_${TEST_NAME} PRIVATE svm_upstream)
            set_target_properties(compare_upstream_${TEST_NAME} PROPERTIES
                RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin/comparison"
            )
        endforeach()
        
        # Create a test that runs the comparison
        add_test(NAME upstream_comparison
            COMMAND ${CMAKE_CURRENT_SOURCE_DIR}/comparison/compare_runner.sh
                    ${CMAKE_BINARY_DIR}/bin/comparison
            WORKING_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}
        )
        
    else()
        message(WARNING "Upstream libsvm not found at ${UPSTREAM_INSTALL_DIR}")
        message(WARNING "Run: ./scripts/run_tests.sh --comparison")
        message(WARNING "This will automatically build upstream version")
    endif()
endif()

# ============================================================================
# OpenCV Comparison Tests
# ============================================================================

option(LIBSVM_BUILD_OPENCV_COMPARISON "Build OpenCV SVM comparison tests" OFF)

if(LIBSVM_BUILD_OPENCV_COMPARISON)
    find_package(OpenCV QUIET COMPONENTS core ml)
    if(OpenCV_FOUND)
        message(STATUS "OpenCV found: ${OpenCV_VERSION}")
        message(STATUS "Building OpenCV SVM comparison tests")
        
        add_executable(opencv_comparison_tests
            comparison/test_opencv_comparison.cpp
            common/test_utils.cpp
        )
        
        target_include_directories(opencv_comparison_tests PRIVATE
            ${CMAKE_CURRENT_SOURCE_DIR}/common
            ${CMAKE_SOURCE_DIR}/src
        )
        
        target_link_libraries(opencv_comparison_tests PRIVATE
            svm
            ${OpenCV_LIBS}
            GTest::gtest
            GTest::gtest_main
        )
        
        target_compile_definitions(opencv_comparison_tests PRIVATE
            TEST_DATA_DIR="${CMAKE_CURRENT_BINARY_DIR}/data"
            OPENCV_AVAILABLE
        )
        
        gtest_discover_tests(opencv_comparison_tests)
    else()
        message(WARNING "OpenCV not found. OpenCV comparison tests will not be built.")
    endif()
endif()

# ============================================================================
# Custom Test Target
# ============================================================================

add_custom_target(run_all_tests
    COMMAND ${CMAKE_CTEST_COMMAND} --output-on-failure
    DEPENDS unit_tests integration_tests memory_tests
    COMMENT "Running all LibSVM tests"
)
