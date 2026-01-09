package com.insurance.claims.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardStats {

    private long totalClaims;
    private long pendingClaims;
    private long approvedClaims;
    private long rejectedClaims;
    private long underReviewClaims;
    private BigDecimal totalClaimAmount;
    private BigDecimal approvedClaimAmount;
}
