package com.insurance.claims.dto;

import com.insurance.claims.model.Claim;
import com.insurance.claims.model.ClaimStatus;
import com.insurance.claims.model.ClaimType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimResponse {

    private String id;
    private String policyNumber;
    private String claimantName;
    private String claimantEmail;
    private ClaimType claimType;
    private BigDecimal claimAmount;
    private LocalDate incidentDate;
    private String description;
    private ClaimStatus status;
    private List<String> documentUrls;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ClaimResponse fromClaim(Claim claim) {
        return ClaimResponse.builder()
                .id(claim.getId())
                .policyNumber(claim.getPolicyNumber())
                .claimantName(claim.getClaimantName())
                .claimantEmail(claim.getClaimantEmail())
                .claimType(claim.getClaimType())
                .claimAmount(claim.getClaimAmount())
                .incidentDate(claim.getIncidentDate())
                .description(claim.getDescription())
                .status(claim.getStatus())
                .documentUrls(claim.getDocumentUrls())
                .createdAt(claim.getCreatedAt())
                .updatedAt(claim.getUpdatedAt())
                .build();
    }
}
