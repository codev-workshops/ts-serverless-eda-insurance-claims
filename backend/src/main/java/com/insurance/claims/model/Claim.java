package com.insurance.claims.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "claims")
public class Claim {

    @Id
    private String id;

    @NotBlank(message = "Policy number is required")
    private String policyNumber;

    @NotBlank(message = "Claimant name is required")
    private String claimantName;

    private String claimantEmail;

    @NotNull(message = "Claim type is required")
    private ClaimType claimType;

    @NotNull(message = "Claim amount is required")
    @Positive(message = "Claim amount must be positive")
    private BigDecimal claimAmount;

    @NotNull(message = "Incident date is required")
    private LocalDate incidentDate;

    private String description;

    @Builder.Default
    private ClaimStatus status = ClaimStatus.PENDING;

    private List<String> documentUrls;

    private String userId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
