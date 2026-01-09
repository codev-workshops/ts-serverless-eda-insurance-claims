package com.insurance.claims.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimStatusUpdate;
import com.insurance.claims.model.Claim;
import com.insurance.claims.model.ClaimStatus;
import com.insurance.claims.model.ClaimType;
import com.insurance.claims.repository.ClaimRepository;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("Claim Controller Integration Tests")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ClaimControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ClaimRepository claimRepository;

    private ClaimRequest testClaimRequest;
    private static String createdClaimId;

    @BeforeEach
    void setUp() {
        testClaimRequest = new ClaimRequest();
        testClaimRequest.setPolicyNumber("POL-INT-001");
        testClaimRequest.setClaimantName("Integration Test User");
        testClaimRequest.setClaimantEmail("integration@test.com");
        testClaimRequest.setClaimType(ClaimType.AUTO);
        testClaimRequest.setClaimAmount(new BigDecimal("5000.00"));
        testClaimRequest.setIncidentDate(LocalDate.now().minusDays(5));
        testClaimRequest.setDescription("Integration test claim description");
    }

    @Nested
    @DisplayName("POST /api/claims - Create Claim")
    class CreateClaimTests {

        @Test
        @Order(1)
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should create claim with valid request")
        void shouldCreateClaimWithValidRequest() throws Exception {
            MvcResult result = mockMvc.perform(post("/api/claims")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(testClaimRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").exists())
                    .andExpect(jsonPath("$.policyNumber").value("POL-INT-001"))
                    .andExpect(jsonPath("$.claimantName").value("Integration Test User"))
                    .andExpect(jsonPath("$.claimType").value("AUTO"))
                    .andExpect(jsonPath("$.status").value("PENDING"))
                    .andReturn();

            String responseBody = result.getResponse().getContentAsString();
            createdClaimId = objectMapper.readTree(responseBody).get("id").asText();
        }

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return 400 for missing required fields")
        void shouldReturn400ForMissingRequiredFields() throws Exception {
            ClaimRequest invalidRequest = new ClaimRequest();

            mockMvc.perform(post("/api/claims")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return 400 for negative claim amount")
        void shouldReturn400ForNegativeClaimAmount() throws Exception {
            testClaimRequest.setClaimAmount(new BigDecimal("-100.00"));

            mockMvc.perform(post("/api/claims")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(testClaimRequest)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("Should return 401 for unauthenticated request")
        void shouldReturn401ForUnauthenticatedRequest() throws Exception {
            mockMvc.perform(post("/api/claims")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(testClaimRequest)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/claims - Get All Claims")
    class GetAllClaimsTests {

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return list of claims")
        void shouldReturnListOfClaims() throws Exception {
            mockMvc.perform(get("/api/claims")
                            .param("allClaims", "false"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());
        }

        @Test
        @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
        @DisplayName("Should return all claims for admin")
        void shouldReturnAllClaimsForAdmin() throws Exception {
            mockMvc.perform(get("/api/claims")
                            .param("allClaims", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$").isArray());
        }

        @Test
        @DisplayName("Should return 401 for unauthenticated request")
        void shouldReturn401ForUnauthenticatedGetRequest() throws Exception {
            mockMvc.perform(get("/api/claims"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/claims/{id} - Get Claim By ID")
    class GetClaimByIdTests {

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return claim when found")
        void shouldReturnClaimWhenFound() throws Exception {
            Claim claim = createTestClaim();

            mockMvc.perform(get("/api/claims/{id}", claim.getId()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(claim.getId()))
                    .andExpect(jsonPath("$.policyNumber").value(claim.getPolicyNumber()));
        }

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return 404 for non-existent claim")
        void shouldReturn404ForNonExistentClaim() throws Exception {
            mockMvc.perform(get("/api/claims/{id}", "nonexistent-id"))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("PUT /api/claims/{id} - Update Claim")
    class UpdateClaimTests {

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should update claim successfully")
        void shouldUpdateClaimSuccessfully() throws Exception {
            Claim claim = createTestClaim();

            testClaimRequest.setClaimantName("Updated Name");
            testClaimRequest.setClaimAmount(new BigDecimal("7500.00"));

            mockMvc.perform(put("/api/claims/{id}", claim.getId())
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(testClaimRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.claimantName").value("Updated Name"))
                    .andExpect(jsonPath("$.claimAmount").value(7500.00));
        }

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return 404 when updating non-existent claim")
        void shouldReturn404WhenUpdatingNonExistentClaim() throws Exception {
            mockMvc.perform(put("/api/claims/{id}", "nonexistent-id")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(testClaimRequest)))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("PATCH /api/claims/{id}/status - Update Claim Status")
    class UpdateClaimStatusTests {

        @Test
        @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
        @DisplayName("Should update claim status to APPROVED")
        void shouldUpdateClaimStatusToApproved() throws Exception {
            Claim claim = createTestClaim();

            ClaimStatusUpdate statusUpdate = new ClaimStatusUpdate();
            statusUpdate.setStatus(ClaimStatus.APPROVED);

            mockMvc.perform(patch("/api/claims/{id}/status", claim.getId())
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(statusUpdate)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("APPROVED"));
        }

        @Test
        @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
        @DisplayName("Should update claim status to REJECTED")
        void shouldUpdateClaimStatusToRejected() throws Exception {
            Claim claim = createTestClaim();

            ClaimStatusUpdate statusUpdate = new ClaimStatusUpdate();
            statusUpdate.setStatus(ClaimStatus.REJECTED);

            mockMvc.perform(patch("/api/claims/{id}/status", claim.getId())
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(statusUpdate)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("REJECTED"));
        }

        @Test
        @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
        @DisplayName("Should update claim status to UNDER_REVIEW")
        void shouldUpdateClaimStatusToUnderReview() throws Exception {
            Claim claim = createTestClaim();

            ClaimStatusUpdate statusUpdate = new ClaimStatusUpdate();
            statusUpdate.setStatus(ClaimStatus.UNDER_REVIEW);

            mockMvc.perform(patch("/api/claims/{id}/status", claim.getId())
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(statusUpdate)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("UNDER_REVIEW"));
        }
    }

    @Nested
    @DisplayName("DELETE /api/claims/{id} - Delete Claim")
    class DeleteClaimTests {

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should delete claim successfully")
        void shouldDeleteClaimSuccessfully() throws Exception {
            Claim claim = createTestClaim();

            mockMvc.perform(delete("/api/claims/{id}", claim.getId())
                            .with(csrf()))
                    .andExpect(status().isNoContent());

            mockMvc.perform(get("/api/claims/{id}", claim.getId()))
                    .andExpect(status().isNotFound());
        }

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return 404 when deleting non-existent claim")
        void shouldReturn404WhenDeletingNonExistentClaim() throws Exception {
            mockMvc.perform(delete("/api/claims/{id}", "nonexistent-id")
                            .with(csrf()))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("GET /api/claims/stats - Get Dashboard Stats")
    class GetDashboardStatsTests {

        @Test
        @WithMockUser(username = "testuser@example.com")
        @DisplayName("Should return dashboard stats")
        void shouldReturnDashboardStats() throws Exception {
            mockMvc.perform(get("/api/claims/stats")
                            .param("allStats", "false"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalClaims").exists())
                    .andExpect(jsonPath("$.pendingClaims").exists())
                    .andExpect(jsonPath("$.approvedClaims").exists())
                    .andExpect(jsonPath("$.rejectedClaims").exists())
                    .andExpect(jsonPath("$.underReviewClaims").exists())
                    .andExpect(jsonPath("$.totalClaimAmount").exists())
                    .andExpect(jsonPath("$.approvedClaimAmount").exists());
        }

        @Test
        @WithMockUser(username = "admin@example.com", roles = {"ADMIN"})
        @DisplayName("Should return all stats for admin")
        void shouldReturnAllStatsForAdmin() throws Exception {
            mockMvc.perform(get("/api/claims/stats")
                            .param("allStats", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalClaims").exists());
        }
    }

    private Claim createTestClaim() {
        Claim claim = Claim.builder()
                .policyNumber("POL-TEST-" + System.currentTimeMillis())
                .claimantName("Test User")
                .claimantEmail("test@example.com")
                .claimType(ClaimType.AUTO)
                .claimAmount(new BigDecimal("5000.00"))
                .incidentDate(LocalDate.now().minusDays(5))
                .description("Test claim")
                .userId("testuser@example.com")
                .status(ClaimStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();
        return claimRepository.save(claim);
    }
}
