CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
CMAKE_POLICY(SET CMP0091 NEW)
PROJECT(TestFindVulkan C CXX)
INCLUDE(CTest)

SET(components
    glslang
    shaderc_combined
    SPIRV-Tools
    volk
    dxc
)

IF (APPLE)
    LIST(APPEND components MoltenVK)
ENDIF ()
FIND_PACKAGE(Vulkan REQUIRED
    COMPONENTS ${components})

ADD_EXECUTABLE(test_tgt main.c)
TARGET_LINK_LIBRARIES(test_tgt Vulkan::Vulkan)
TARGET_COMPILE_FEATURES(test_tgt PRIVATE cxx_std_11)
ADD_TEST(NAME test_tgt COMMAND test_tgt)

ADD_EXECUTABLE(test_var main.c)
TARGET_INCLUDE_DIRECTORIES(test_var PRIVATE ${Vulkan_INCLUDE_DIRS})
TARGET_LINK_LIBRARIES(test_var PRIVATE ${Vulkan_LIBRARIES})
TARGET_COMPILE_FEATURES(test_var PRIVATE cxx_std_11)
ADD_TEST(NAME test_var COMMAND test_var)

ADD_EXECUTABLE(test_tgt_dl main-dynamicVulkanLoading.cpp)
TARGET_LINK_LIBRARIES(test_tgt_dl Vulkan::Headers ${CMAKE_DL_LIBS})
TARGET_COMPILE_FEATURES(test_tgt_dl PRIVATE cxx_std_11)
ADD_TEST(NAME test_tgt_dl COMMAND test_tgt_dl)

ADD_EXECUTABLE(test_var_dl main-dynamicVulkanLoading.cpp)
TARGET_INCLUDE_DIRECTORIES(test_var_dl PRIVATE ${Vulkan_INCLUDE_DIRS})
TARGET_LINK_LIBRARIES(test_var_dl ${CMAKE_DL_LIBS})
TARGET_COMPILE_FEATURES(test_var_dl PRIVATE cxx_std_11)
ADD_TEST(NAME test_var_dl COMMAND test_var_dl)

ADD_EXECUTABLE(test_tgt_glslang main-glslang.cxx)
TARGET_LINK_LIBRARIES(test_tgt_glslang Vulkan::glslang)
ADD_TEST(NAME test_tgt_glslang COMMAND test_tgt_glslang)

GET_PROPERTY(glslang_debug_location TARGET Vulkan::glslang PROPERTY IMPORTED_LOCATION_DEBUG)
IF (NOT glslang_debug_location)
    SET_PROPERTY(TARGET test_tgt_glslang
        PROPERTY
        MSVC_RUNTIME_LIBRARY "MultiThreadedDLL")
ENDIF ()

ADD_EXECUTABLE(test_tgt_shaderc_combined main-shaderc_combined.cxx)
TARGET_LINK_LIBRARIES(test_tgt_shaderc_combined Vulkan::shaderc_combined)
ADD_TEST(NAME test_tgt_shaderc_combined COMMAND test_tgt_shaderc_combined)

GET_PROPERTY(shaderc_combined_debug_location TARGET Vulkan::shaderc_combined PROPERTY IMPORTED_LOCATION_DEBUG)
IF (NOT shaderc_combined_debug_location)
    SET_PROPERTY(TARGET test_tgt_shaderc_combined
        PROPERTY
        MSVC_RUNTIME_LIBRARY "MultiThreadedDLL")
ENDIF ()

ADD_EXECUTABLE(test_tgt_SPIRV-Tools main-SPIRV-Tools.c)
TARGET_LINK_LIBRARIES(test_tgt_SPIRV-Tools Vulkan::SPIRV-Tools)
ADD_TEST(NAME test_tgt_SPIRV-Tools COMMAND test_tgt_SPIRV-Tools)

GET_PROPERTY(SPIRV-Tools_debug_location TARGET Vulkan::SPIRV-Tools PROPERTY IMPORTED_LOCATION_DEBUG)
IF (NOT SPIRV-Tools_debug_location)
    SET_PROPERTY(TARGET test_tgt_SPIRV-Tools
        PROPERTY
        MSVC_RUNTIME_LIBRARY "MultiThreadedDLL")
ENDIF ()

IF (APPLE)
    ADD_EXECUTABLE(test_tgt_MoltenVK main-MoltenVK.cxx)
    TARGET_LINK_LIBRARIES(test_tgt_MoltenVK Vulkan::MoltenVK)
    ADD_TEST(NAME test_tgt_MoltenVK COMMAND test_tgt_MoltenVK)
ENDIF ()

ADD_EXECUTABLE(test_tgt_volk main-volk.cxx)
TARGET_LINK_LIBRARIES(test_tgt_volk Vulkan::volk)
ADD_TEST(NAME test_tgt_volk COMMAND test_tgt_volk)

ADD_EXECUTABLE(test_tgt_dxc_lib main-dxc_lib.cxx)
TARGET_LINK_LIBRARIES(test_tgt_dxc_lib Vulkan::dxc_lib)
ADD_TEST(NAME test_tgt_dxc_lib COMMAND test_tgt_dxc_lib)

IF (Vulkan_GLSLC_EXECUTABLE)
    ADD_TEST(NAME test_glslc
        COMMAND ${CMAKE_COMMAND}
        "-DVULKAN_GLSLC_EXECUTABLE=${Vulkan_GLSLC_EXECUTABLE}"
        "-DVULKAN_GLSLC_EXECUTABLE_TARGET=$<TARGET_FILE:Vulkan::glslc>"
        -P "${CMAKE_CURRENT_LIST_DIR}/Run-glslc.cmake"
    )
ENDIF ()

IF (Vulkan_GLSLANG_VALIDATOR_EXECUTABLE)
    ADD_TEST(NAME test_glslangValidator
        COMMAND ${CMAKE_COMMAND}
        "-DVULKAN_GLSLANG_VALIDATOR_EXECUTABLE=${Vulkan_GLSLANG_VALIDATOR_EXECUTABLE}"
        "-DVULKAN_GLSLANG_VALIDATOR_EXECUTABLE_TARGET=$<TARGET_FILE:Vulkan::glslangValidator>"
        -P "${CMAKE_CURRENT_LIST_DIR}/Run-glslangValidator.cmake"
    )
ENDIF ()

IF (Vulkan_dxc_EXECUTABLE)
    ADD_TEST(NAME test_dxc_exe
        COMMAND ${CMAKE_COMMAND}
        "-DVULKAN_DXC_EXECUTABLE=${Vulkan_dxc_EXECUTABLE}"
        "-DVULKAN_DXC_EXECUTABLE_TARGET=$<TARGET_FILE:Vulkan::dxc_exe>"
        -P "${CMAKE_CURRENT_LIST_DIR}/Run-dxc_exe.cmake"
    )
ENDIF ()
