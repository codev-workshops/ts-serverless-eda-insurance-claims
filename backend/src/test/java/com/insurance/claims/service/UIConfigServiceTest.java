package com.insurance.claims.service;

import com.insurance.claims.dto.UIConfigRequest;
import com.insurance.claims.model.UIConfig;
import com.insurance.claims.repository.UIConfigRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UIConfigService Unit Tests")
class UIConfigServiceTest {

    @Mock
    private UIConfigRepository uiConfigRepository;

    @InjectMocks
    private UIConfigService uiConfigService;

    private UIConfig testConfig;
    private String testPageId;
    private String testUpdatedBy;

    @BeforeEach
    void setUp() {
        testPageId = "dashboard";
        testUpdatedBy = "admin@example.com";

        Map<String, String> labels = new HashMap<>();
        labels.put("pageTitle", "Dashboard");
        labels.put("totalClaims", "Total Claims");

        Map<String, String> staticContent = new HashMap<>();
        staticContent.put("welcomeMessage", "Welcome to Insurance Claims Portal");

        testConfig = UIConfig.builder()
                .id("config123")
                .pageId(testPageId)
                .labels(labels)
                .staticContent(staticContent)
                .updatedAt(LocalDateTime.now())
                .updatedBy(testUpdatedBy)
                .build();
    }

    @Nested
    @DisplayName("Get Config By Page ID Tests")
    class GetConfigByPageIdTests {

        @Test
        @DisplayName("Should return existing config for page")
        void shouldReturnExistingConfigForPage() {
            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));

            UIConfig result = uiConfigService.getConfigByPageId(testPageId);

            assertNotNull(result);
            assertEquals(testPageId, result.getPageId());
            assertEquals("Dashboard", result.getLabels().get("pageTitle"));
        }

        @Test
        @DisplayName("Should create default config when not found")
        void shouldCreateDefaultConfigWhenNotFound() {
            when(uiConfigRepository.findByPageId("newPage")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.getConfigByPageId("newPage");

            assertNotNull(result);
            assertEquals("newPage", result.getPageId());
            verify(uiConfigRepository, times(1)).save(any(UIConfig.class));
        }

        @Test
        @DisplayName("Should create default labels for dashboard page")
        void shouldCreateDefaultLabelsForDashboardPage() {
            when(uiConfigRepository.findByPageId("dashboard")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.getConfigByPageId("dashboard");

            assertNotNull(result.getLabels());
            assertEquals("Dashboard", result.getLabels().get("pageTitle"));
            assertEquals("Total Claims", result.getLabels().get("totalClaims"));
        }

        @Test
        @DisplayName("Should create default labels for claims page")
        void shouldCreateDefaultLabelsForClaimsPage() {
            when(uiConfigRepository.findByPageId("claims")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.getConfigByPageId("claims");

            assertNotNull(result.getLabels());
            assertEquals("Claims", result.getLabels().get("pageTitle"));
            assertEquals("New Claim", result.getLabels().get("newClaim"));
        }

        @Test
        @DisplayName("Should create default labels for claimForm page")
        void shouldCreateDefaultLabelsForClaimFormPage() {
            when(uiConfigRepository.findByPageId("claimForm")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.getConfigByPageId("claimForm");

            assertNotNull(result.getLabels());
            assertEquals("Submit New Claim", result.getLabels().get("pageTitle"));
            assertEquals("Submit Claim", result.getLabels().get("submit"));
        }

        @Test
        @DisplayName("Should create default labels for admin page")
        void shouldCreateDefaultLabelsForAdminPage() {
            when(uiConfigRepository.findByPageId("admin")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.getConfigByPageId("admin");

            assertNotNull(result.getLabels());
            assertEquals("Admin Settings", result.getLabels().get("pageTitle"));
            assertEquals("Save Changes", result.getLabels().get("saveChanges"));
        }

        @Test
        @DisplayName("Should create default static content for dashboard")
        void shouldCreateDefaultStaticContentForDashboard() {
            when(uiConfigRepository.findByPageId("dashboard")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.getConfigByPageId("dashboard");

            assertNotNull(result.getStaticContent());
            assertEquals("Welcome to Insurance Claims Portal", result.getStaticContent().get("welcomeMessage"));
        }

        @Test
        @DisplayName("Should create default static content for claimForm")
        void shouldCreateDefaultStaticContentForClaimForm() {
            when(uiConfigRepository.findByPageId("claimForm")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.getConfigByPageId("claimForm");

            assertNotNull(result.getStaticContent());
            assertTrue(result.getStaticContent().containsKey("instructions"));
            assertTrue(result.getStaticContent().containsKey("successMessage"));
        }
    }

    @Nested
    @DisplayName("Get All Configs Tests")
    class GetAllConfigsTests {

        @Test
        @DisplayName("Should return all configs")
        void shouldReturnAllConfigs() {
            UIConfig config2 = UIConfig.builder()
                    .id("config456")
                    .pageId("claims")
                    .labels(new HashMap<>())
                    .staticContent(new HashMap<>())
                    .build();

            when(uiConfigRepository.findAll()).thenReturn(Arrays.asList(testConfig, config2));

            List<UIConfig> configs = uiConfigService.getAllConfigs();

            assertEquals(2, configs.size());
            verify(uiConfigRepository, times(1)).findAll();
        }

        @Test
        @DisplayName("Should return empty list when no configs exist")
        void shouldReturnEmptyListWhenNoConfigsExist() {
            when(uiConfigRepository.findAll()).thenReturn(Collections.emptyList());

            List<UIConfig> configs = uiConfigService.getAllConfigs();

            assertTrue(configs.isEmpty());
        }
    }

    @Nested
    @DisplayName("Update Config Tests")
    class UpdateConfigTests {

        @Test
        @DisplayName("Should update existing config labels")
        void shouldUpdateExistingConfigLabels() {
            Map<String, String> newLabels = new HashMap<>();
            newLabels.put("pageTitle", "Updated Dashboard");
            newLabels.put("newLabel", "New Label Value");

            UIConfigRequest request = new UIConfigRequest();
            request.setPageId(testPageId);
            request.setLabels(newLabels);

            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.updateConfig(request, testUpdatedBy);

            assertEquals("Updated Dashboard", result.getLabels().get("pageTitle"));
            assertEquals("New Label Value", result.getLabels().get("newLabel"));
        }

        @Test
        @DisplayName("Should update existing config static content")
        void shouldUpdateExistingConfigStaticContent() {
            Map<String, String> newContent = new HashMap<>();
            newContent.put("welcomeMessage", "Updated Welcome Message");

            UIConfigRequest request = new UIConfigRequest();
            request.setPageId(testPageId);
            request.setStaticContent(newContent);

            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.updateConfig(request, testUpdatedBy);

            assertEquals("Updated Welcome Message", result.getStaticContent().get("welcomeMessage"));
        }

        @Test
        @DisplayName("Should create new config when not found")
        void shouldCreateNewConfigWhenNotFound() {
            Map<String, String> labels = new HashMap<>();
            labels.put("pageTitle", "New Page");

            UIConfigRequest request = new UIConfigRequest();
            request.setPageId("newPage");
            request.setLabels(labels);

            when(uiConfigRepository.findByPageId("newPage")).thenReturn(Optional.empty());
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.updateConfig(request, testUpdatedBy);

            assertEquals("newPage", result.getPageId());
            assertEquals("New Page", result.getLabels().get("pageTitle"));
        }

        @Test
        @DisplayName("Should set updatedAt timestamp")
        void shouldSetUpdatedAtTimestamp() {
            UIConfigRequest request = new UIConfigRequest();
            request.setPageId(testPageId);
            request.setLabels(new HashMap<>());

            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> {
                UIConfig config = invocation.getArgument(0);
                assertNotNull(config.getUpdatedAt());
                return config;
            });

            uiConfigService.updateConfig(request, testUpdatedBy);

            verify(uiConfigRepository, times(1)).save(any(UIConfig.class));
        }

        @Test
        @DisplayName("Should set updatedBy field")
        void shouldSetUpdatedByField() {
            UIConfigRequest request = new UIConfigRequest();
            request.setPageId(testPageId);
            request.setLabels(new HashMap<>());

            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> {
                UIConfig config = invocation.getArgument(0);
                assertEquals(testUpdatedBy, config.getUpdatedBy());
                return config;
            });

            uiConfigService.updateConfig(request, testUpdatedBy);

            verify(uiConfigRepository, times(1)).save(any(UIConfig.class));
        }

        @Test
        @DisplayName("Should preserve existing labels when only updating static content")
        void shouldPreserveExistingLabelsWhenOnlyUpdatingStaticContent() {
            Map<String, String> newContent = new HashMap<>();
            newContent.put("newContent", "New Content Value");

            UIConfigRequest request = new UIConfigRequest();
            request.setPageId(testPageId);
            request.setStaticContent(newContent);

            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.updateConfig(request, testUpdatedBy);

            assertEquals("Dashboard", result.getLabels().get("pageTitle"));
        }

        @Test
        @DisplayName("Should handle null labels in request")
        void shouldHandleNullLabelsInRequest() {
            UIConfigRequest request = new UIConfigRequest();
            request.setPageId(testPageId);
            request.setLabels(null);
            request.setStaticContent(new HashMap<>());

            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.updateConfig(request, testUpdatedBy);

            assertNotNull(result);
            assertEquals("Dashboard", result.getLabels().get("pageTitle"));
        }

        @Test
        @DisplayName("Should handle null static content in request")
        void shouldHandleNullStaticContentInRequest() {
            UIConfigRequest request = new UIConfigRequest();
            request.setPageId(testPageId);
            request.setLabels(new HashMap<>());
            request.setStaticContent(null);

            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            when(uiConfigRepository.save(any(UIConfig.class))).thenAnswer(invocation -> invocation.getArgument(0));

            UIConfig result = uiConfigService.updateConfig(request, testUpdatedBy);

            assertNotNull(result);
        }
    }

    @Nested
    @DisplayName("Delete Config Tests")
    class DeleteConfigTests {

        @Test
        @DisplayName("Should delete config successfully")
        void shouldDeleteConfigSuccessfully() {
            when(uiConfigRepository.findByPageId(testPageId)).thenReturn(Optional.of(testConfig));
            doNothing().when(uiConfigRepository).delete(testConfig);

            assertDoesNotThrow(() -> uiConfigService.deleteConfig(testPageId));

            verify(uiConfigRepository, times(1)).delete(testConfig);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent config")
        void shouldThrowExceptionWhenDeletingNonExistentConfig() {
            when(uiConfigRepository.findByPageId("nonexistent")).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class,
                    () -> uiConfigService.deleteConfig("nonexistent"));

            verify(uiConfigRepository, never()).delete(any(UIConfig.class));
        }
    }
}
