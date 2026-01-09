package com.insurance.claims.service;

import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimResponse;
import com.insurance.claims.dto.ClaimStatusUpdate;
import com.insurance.claims.dto.DashboardStats;
import com.insurance.claims.model.Claim;
import com.insurance.claims.model.ClaimStatus;
import com.insurance.claims.model.ClaimType;
import com.insurance.claims.repository.ClaimRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("ClaimService Unit Tests")
class ClaimServiceTest {

    @Mock
    private ClaimRepository claimRepository;

    @InjectMocks
    private ClaimService claimService;

    private Claim testClaim;
    private ClaimRequest testClaimRequest;
    private String testUserId;
    private String testClaimId;

    @BeforeEach
    void setUp() {
        testUserId = "user123";
        testClaimId = "claim123";

        testClaim = Claim.builder()
                .id(testClaimId)
                .policyNumber("POL-001")
                .claimantName("John Doe")
                .claimantEmail("john.doe@example.com")
                .claimType(ClaimType.AUTO)
                .claimAmount(new BigDecimal("5000.00"))
                .incidentDate(LocalDate.now().minusDays(5))
                .description("Car accident on highway")
                .userId(testUserId)
                .status(ClaimStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        testClaimRequest = new ClaimRequest();
        testClaimRequest.setPolicyNumber("POL-001");
        testClaimRequest.setClaimantName("John Doe");
        testClaimRequest.setClaimantEmail("john.doe@example.com");
        testClaimRequest.setClaimType(ClaimType.AUTO);
        testClaimRequest.setClaimAmount(new BigDecimal("5000.00"));
        testClaimRequest.setIncidentDate(LocalDate.now().minusDays(5));
        testClaimRequest.setDescription("Car accident on highway");
    }

    @Nested
    @DisplayName("Create Claim Tests")
    class CreateClaimTests {

        @Test
        @DisplayName("Should create claim successfully with valid request")
        void shouldCreateClaimSuccessfully() {
            when(claimRepository.save(any(Claim.class))).thenReturn(testClaim);

            ClaimResponse response = claimService.createClaim(testClaimRequest, testUserId);

            assertNotNull(response);
            assertEquals(testClaimId, response.getId());
            assertEquals("POL-001", response.getPolicyNumber());
            assertEquals("John Doe", response.getClaimantName());
            assertEquals(ClaimType.AUTO, response.getClaimType());
            assertEquals(ClaimStatus.PENDING, response.getStatus());
            verify(claimRepository, times(1)).save(any(Claim.class));
        }

        @Test
        @DisplayName("Should set initial status as PENDING")
        void shouldSetInitialStatusAsPending() {
            when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> {
                Claim claim = invocation.getArgument(0);
                assertEquals(ClaimStatus.PENDING, claim.getStatus());
                return testClaim;
            });

            claimService.createClaim(testClaimRequest, testUserId);

            verify(claimRepository, times(1)).save(any(Claim.class));
        }

        @Test
        @DisplayName("Should set userId correctly")
        void shouldSetUserIdCorrectly() {
            when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> {
                Claim claim = invocation.getArgument(0);
                assertEquals(testUserId, claim.getUserId());
                return testClaim;
            });

            claimService.createClaim(testClaimRequest, testUserId);

            verify(claimRepository, times(1)).save(any(Claim.class));
        }

        @Test
        @DisplayName("Should handle different claim types")
        void shouldHandleDifferentClaimTypes() {
            for (ClaimType type : ClaimType.values()) {
                testClaimRequest.setClaimType(type);
                testClaim.setClaimType(type);
                when(claimRepository.save(any(Claim.class))).thenReturn(testClaim);

                ClaimResponse response = claimService.createClaim(testClaimRequest, testUserId);

                assertEquals(type, response.getClaimType());
            }
        }
    }

    @Nested
    @DisplayName("Get All Claims Tests")
    class GetAllClaimsTests {

        @Test
        @DisplayName("Should return all claims")
        void shouldReturnAllClaims() {
            Claim claim2 = Claim.builder()
                    .id("claim456")
                    .policyNumber("POL-002")
                    .claimantName("Jane Smith")
                    .claimType(ClaimType.HEALTH)
                    .claimAmount(new BigDecimal("3000.00"))
                    .status(ClaimStatus.APPROVED)
                    .build();

            when(claimRepository.findAll()).thenReturn(Arrays.asList(testClaim, claim2));

            List<ClaimResponse> claims = claimService.getAllClaims();

            assertEquals(2, claims.size());
            verify(claimRepository, times(1)).findAll();
        }

        @Test
        @DisplayName("Should return empty list when no claims exist")
        void shouldReturnEmptyListWhenNoClaimsExist() {
            when(claimRepository.findAll()).thenReturn(Collections.emptyList());

            List<ClaimResponse> claims = claimService.getAllClaims();

            assertTrue(claims.isEmpty());
            verify(claimRepository, times(1)).findAll();
        }
    }

    @Nested
    @DisplayName("Get Claims By User ID Tests")
    class GetClaimsByUserIdTests {

        @Test
        @DisplayName("Should return claims for specific user")
        void shouldReturnClaimsForSpecificUser() {
            when(claimRepository.findByUserId(testUserId)).thenReturn(Collections.singletonList(testClaim));

            List<ClaimResponse> claims = claimService.getClaimsByUserId(testUserId);

            assertEquals(1, claims.size());
            assertEquals(testClaimId, claims.get(0).getId());
            verify(claimRepository, times(1)).findByUserId(testUserId);
        }

        @Test
        @DisplayName("Should return empty list for user with no claims")
        void shouldReturnEmptyListForUserWithNoClaims() {
            when(claimRepository.findByUserId("nonexistent")).thenReturn(Collections.emptyList());

            List<ClaimResponse> claims = claimService.getClaimsByUserId("nonexistent");

            assertTrue(claims.isEmpty());
        }
    }

    @Nested
    @DisplayName("Get Claim By ID Tests")
    class GetClaimByIdTests {

        @Test
        @DisplayName("Should return claim when found")
        void shouldReturnClaimWhenFound() {
            when(claimRepository.findById(testClaimId)).thenReturn(Optional.of(testClaim));

            ClaimResponse response = claimService.getClaimById(testClaimId);

            assertNotNull(response);
            assertEquals(testClaimId, response.getId());
            assertEquals("POL-001", response.getPolicyNumber());
        }

        @Test
        @DisplayName("Should throw exception when claim not found")
        void shouldThrowExceptionWhenClaimNotFound() {
            when(claimRepository.findById("nonexistent")).thenReturn(Optional.empty());

            RuntimeException exception = assertThrows(RuntimeException.class,
                    () -> claimService.getClaimById("nonexistent"));

            assertTrue(exception.getMessage().contains("Claim not found"));
        }
    }

    @Nested
    @DisplayName("Update Claim Tests")
    class UpdateClaimTests {

        @Test
        @DisplayName("Should update claim successfully")
        void shouldUpdateClaimSuccessfully() {
            ClaimRequest updateRequest = new ClaimRequest();
            updateRequest.setPolicyNumber("POL-001-UPDATED");
            updateRequest.setClaimantName("John Doe Updated");
            updateRequest.setClaimantEmail("john.updated@example.com");
            updateRequest.setClaimType(ClaimType.HEALTH);
            updateRequest.setClaimAmount(new BigDecimal("7500.00"));
            updateRequest.setIncidentDate(LocalDate.now());
            updateRequest.setDescription("Updated description");

            Claim updatedClaim = Claim.builder()
                    .id(testClaimId)
                    .policyNumber("POL-001-UPDATED")
                    .claimantName("John Doe Updated")
                    .claimantEmail("john.updated@example.com")
                    .claimType(ClaimType.HEALTH)
                    .claimAmount(new BigDecimal("7500.00"))
                    .status(ClaimStatus.PENDING)
                    .build();

            when(claimRepository.findById(testClaimId)).thenReturn(Optional.of(testClaim));
            when(claimRepository.save(any(Claim.class))).thenReturn(updatedClaim);

            ClaimResponse response = claimService.updateClaim(testClaimId, updateRequest);

            assertNotNull(response);
            assertEquals("POL-001-UPDATED", response.getPolicyNumber());
            assertEquals("John Doe Updated", response.getClaimantName());
            assertEquals(ClaimType.HEALTH, response.getClaimType());
        }

        @Test
        @DisplayName("Should throw exception when updating non-existent claim")
        void shouldThrowExceptionWhenUpdatingNonExistentClaim() {
            when(claimRepository.findById("nonexistent")).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class,
                    () -> claimService.updateClaim("nonexistent", testClaimRequest));
        }

        @Test
        @DisplayName("Should set updatedAt timestamp")
        void shouldSetUpdatedAtTimestamp() {
            when(claimRepository.findById(testClaimId)).thenReturn(Optional.of(testClaim));
            when(claimRepository.save(any(Claim.class))).thenAnswer(invocation -> {
                Claim claim = invocation.getArgument(0);
                assertNotNull(claim.getUpdatedAt());
                return claim;
            });

            claimService.updateClaim(testClaimId, testClaimRequest);

            verify(claimRepository, times(1)).save(any(Claim.class));
        }
    }

    @Nested
    @DisplayName("Update Claim Status Tests")
    class UpdateClaimStatusTests {

        @Test
        @DisplayName("Should update status to APPROVED")
        void shouldUpdateStatusToApproved() {
            ClaimStatusUpdate statusUpdate = new ClaimStatusUpdate();
            statusUpdate.setStatus(ClaimStatus.APPROVED);

            Claim approvedClaim = Claim.builder()
                    .id(testClaimId)
                    .status(ClaimStatus.APPROVED)
                    .build();

            when(claimRepository.findById(testClaimId)).thenReturn(Optional.of(testClaim));
            when(claimRepository.save(any(Claim.class))).thenReturn(approvedClaim);

            ClaimResponse response = claimService.updateClaimStatus(testClaimId, statusUpdate);

            assertEquals(ClaimStatus.APPROVED, response.getStatus());
        }

        @Test
        @DisplayName("Should update status to REJECTED")
        void shouldUpdateStatusToRejected() {
            ClaimStatusUpdate statusUpdate = new ClaimStatusUpdate();
            statusUpdate.setStatus(ClaimStatus.REJECTED);

            Claim rejectedClaim = Claim.builder()
                    .id(testClaimId)
                    .status(ClaimStatus.REJECTED)
                    .build();

            when(claimRepository.findById(testClaimId)).thenReturn(Optional.of(testClaim));
            when(claimRepository.save(any(Claim.class))).thenReturn(rejectedClaim);

            ClaimResponse response = claimService.updateClaimStatus(testClaimId, statusUpdate);

            assertEquals(ClaimStatus.REJECTED, response.getStatus());
        }

        @Test
        @DisplayName("Should update status to UNDER_REVIEW")
        void shouldUpdateStatusToUnderReview() {
            ClaimStatusUpdate statusUpdate = new ClaimStatusUpdate();
            statusUpdate.setStatus(ClaimStatus.UNDER_REVIEW);

            Claim underReviewClaim = Claim.builder()
                    .id(testClaimId)
                    .status(ClaimStatus.UNDER_REVIEW)
                    .build();

            when(claimRepository.findById(testClaimId)).thenReturn(Optional.of(testClaim));
            when(claimRepository.save(any(Claim.class))).thenReturn(underReviewClaim);

            ClaimResponse response = claimService.updateClaimStatus(testClaimId, statusUpdate);

            assertEquals(ClaimStatus.UNDER_REVIEW, response.getStatus());
        }

        @Test
        @DisplayName("Should throw exception when updating status of non-existent claim")
        void shouldThrowExceptionWhenUpdatingStatusOfNonExistentClaim() {
            ClaimStatusUpdate statusUpdate = new ClaimStatusUpdate();
            statusUpdate.setStatus(ClaimStatus.APPROVED);

            when(claimRepository.findById("nonexistent")).thenReturn(Optional.empty());

            assertThrows(RuntimeException.class,
                    () -> claimService.updateClaimStatus("nonexistent", statusUpdate));
        }
    }

    @Nested
    @DisplayName("Delete Claim Tests")
    class DeleteClaimTests {

        @Test
        @DisplayName("Should delete claim successfully")
        void shouldDeleteClaimSuccessfully() {
            when(claimRepository.existsById(testClaimId)).thenReturn(true);
            doNothing().when(claimRepository).deleteById(testClaimId);

            assertDoesNotThrow(() -> claimService.deleteClaim(testClaimId));

            verify(claimRepository, times(1)).deleteById(testClaimId);
        }

        @Test
        @DisplayName("Should throw exception when deleting non-existent claim")
        void shouldThrowExceptionWhenDeletingNonExistentClaim() {
            when(claimRepository.existsById("nonexistent")).thenReturn(false);

            assertThrows(RuntimeException.class,
                    () -> claimService.deleteClaim("nonexistent"));

            verify(claimRepository, never()).deleteById(any());
        }
    }

    @Nested
    @DisplayName("Dashboard Stats Tests")
    class DashboardStatsTests {

        @Test
        @DisplayName("Should calculate stats for all claims")
        void shouldCalculateStatsForAllClaims() {
            List<Claim> claims = Arrays.asList(
                    createClaimWithStatus(ClaimStatus.PENDING, new BigDecimal("1000")),
                    createClaimWithStatus(ClaimStatus.APPROVED, new BigDecimal("2000")),
                    createClaimWithStatus(ClaimStatus.APPROVED, new BigDecimal("3000")),
                    createClaimWithStatus(ClaimStatus.REJECTED, new BigDecimal("1500")),
                    createClaimWithStatus(ClaimStatus.UNDER_REVIEW, new BigDecimal("2500"))
            );

            when(claimRepository.findAll()).thenReturn(claims);

            DashboardStats stats = claimService.getDashboardStats(null);

            assertEquals(5, stats.getTotalClaims());
            assertEquals(1, stats.getPendingClaims());
            assertEquals(2, stats.getApprovedClaims());
            assertEquals(1, stats.getRejectedClaims());
            assertEquals(1, stats.getUnderReviewClaims());
            assertEquals(new BigDecimal("10000"), stats.getTotalClaimAmount());
            assertEquals(new BigDecimal("5000"), stats.getApprovedClaimAmount());
        }

        @Test
        @DisplayName("Should calculate stats for specific user")
        void shouldCalculateStatsForSpecificUser() {
            List<Claim> userClaims = Arrays.asList(
                    createClaimWithStatus(ClaimStatus.PENDING, new BigDecimal("1000")),
                    createClaimWithStatus(ClaimStatus.APPROVED, new BigDecimal("2000"))
            );

            when(claimRepository.findByUserId(testUserId)).thenReturn(userClaims);

            DashboardStats stats = claimService.getDashboardStats(testUserId);

            assertEquals(2, stats.getTotalClaims());
            assertEquals(1, stats.getPendingClaims());
            assertEquals(1, stats.getApprovedClaims());
            assertEquals(new BigDecimal("3000"), stats.getTotalClaimAmount());
            assertEquals(new BigDecimal("2000"), stats.getApprovedClaimAmount());
        }

        @Test
        @DisplayName("Should return zero stats when no claims exist")
        void shouldReturnZeroStatsWhenNoClaimsExist() {
            when(claimRepository.findAll()).thenReturn(Collections.emptyList());

            DashboardStats stats = claimService.getDashboardStats(null);

            assertEquals(0, stats.getTotalClaims());
            assertEquals(0, stats.getPendingClaims());
            assertEquals(0, stats.getApprovedClaims());
            assertEquals(0, stats.getRejectedClaims());
            assertEquals(0, stats.getUnderReviewClaims());
            assertEquals(BigDecimal.ZERO, stats.getTotalClaimAmount());
            assertEquals(BigDecimal.ZERO, stats.getApprovedClaimAmount());
        }

        private Claim createClaimWithStatus(ClaimStatus status, BigDecimal amount) {
            return Claim.builder()
                    .id("claim-" + System.nanoTime())
                    .status(status)
                    .claimAmount(amount)
                    .build();
        }
    }
}
