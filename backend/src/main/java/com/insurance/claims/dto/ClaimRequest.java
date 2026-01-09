package com.insurance.claims.dto;

import com.insurance.claims.model.ClaimType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClaimRequest {

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

    private List<String> documentUrls;
}
