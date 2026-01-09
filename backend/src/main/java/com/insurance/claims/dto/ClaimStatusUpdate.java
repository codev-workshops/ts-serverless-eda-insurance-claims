package com.insurance.claims.dto;

import com.insurance.claims.model.ClaimStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClaimStatusUpdate {

    @NotNull(message = "Status is required")
    private ClaimStatus status;
}
