package com.insurance.claims.service;

import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimResponse;
import com.insurance.claims.dto.ClaimStatusUpdate;
import com.insurance.claims.dto.DashboardStats;
import com.insurance.claims.model.Claim;
import com.insurance.claims.model.ClaimStatus;
import com.insurance.claims.repository.ClaimRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ClaimService {

    private final ClaimRepository claimRepository;

    public ClaimResponse createClaim(ClaimRequest request, String userId) {
        Claim claim = Claim.builder()
                .policyNumber(request.getPolicyNumber())
                .claimantName(request.getClaimantName())
                .claimantEmail(request.getClaimantEmail())
                .claimType(request.getClaimType())
                .claimAmount(request.getClaimAmount())
                .incidentDate(request.getIncidentDate())
                .description(request.getDescription())
                .documentUrls(request.getDocumentUrls())
                .userId(userId)
                .status(ClaimStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .build();

        Claim savedClaim = claimRepository.save(claim);
        return ClaimResponse.fromClaim(savedClaim);
    }

    public List<ClaimResponse> getAllClaims() {
        return claimRepository.findAll().stream()
                .map(ClaimResponse::fromClaim)
                .collect(Collectors.toList());
    }

    public List<ClaimResponse> getClaimsByUserId(String userId) {
        return claimRepository.findByUserId(userId).stream()
                .map(ClaimResponse::fromClaim)
                .collect(Collectors.toList());
    }

    public ClaimResponse getClaimById(String id) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found with id: " + id));
        return ClaimResponse.fromClaim(claim);
    }

    public ClaimResponse updateClaim(String id, ClaimRequest request) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found with id: " + id));

        claim.setPolicyNumber(request.getPolicyNumber());
        claim.setClaimantName(request.getClaimantName());
        claim.setClaimantEmail(request.getClaimantEmail());
        claim.setClaimType(request.getClaimType());
        claim.setClaimAmount(request.getClaimAmount());
        claim.setIncidentDate(request.getIncidentDate());
        claim.setDescription(request.getDescription());
        claim.setDocumentUrls(request.getDocumentUrls());
        claim.setUpdatedAt(LocalDateTime.now());

        Claim updatedClaim = claimRepository.save(claim);
        return ClaimResponse.fromClaim(updatedClaim);
    }

    public ClaimResponse updateClaimStatus(String id, ClaimStatusUpdate statusUpdate) {
        Claim claim = claimRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Claim not found with id: " + id));

        claim.setStatus(statusUpdate.getStatus());
        claim.setUpdatedAt(LocalDateTime.now());

        Claim updatedClaim = claimRepository.save(claim);
        return ClaimResponse.fromClaim(updatedClaim);
    }

    public void deleteClaim(String id) {
        if (!claimRepository.existsById(id)) {
            throw new RuntimeException("Claim not found with id: " + id);
        }
        claimRepository.deleteById(id);
    }

    public DashboardStats getDashboardStats(String userId) {
        List<Claim> claims = userId != null 
                ? claimRepository.findByUserId(userId) 
                : claimRepository.findAll();

        long totalClaims = claims.size();
        long pendingClaims = claims.stream().filter(c -> c.getStatus() == ClaimStatus.PENDING).count();
        long approvedClaims = claims.stream().filter(c -> c.getStatus() == ClaimStatus.APPROVED).count();
        long rejectedClaims = claims.stream().filter(c -> c.getStatus() == ClaimStatus.REJECTED).count();
        long underReviewClaims = claims.stream().filter(c -> c.getStatus() == ClaimStatus.UNDER_REVIEW).count();

        BigDecimal totalClaimAmount = claims.stream()
                .map(Claim::getClaimAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal approvedClaimAmount = claims.stream()
                .filter(c -> c.getStatus() == ClaimStatus.APPROVED)
                .map(Claim::getClaimAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return DashboardStats.builder()
                .totalClaims(totalClaims)
                .pendingClaims(pendingClaims)
                .approvedClaims(approvedClaims)
                .rejectedClaims(rejectedClaims)
                .underReviewClaims(underReviewClaims)
                .totalClaimAmount(totalClaimAmount)
                .approvedClaimAmount(approvedClaimAmount)
                .build();
    }
}
