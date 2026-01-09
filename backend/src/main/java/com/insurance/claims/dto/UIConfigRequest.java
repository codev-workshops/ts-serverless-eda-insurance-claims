package com.insurance.claims.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UIConfigRequest {

    @NotBlank(message = "Page ID is required")
    private String pageId;

    private Map<String, String> labels;

    private Map<String, String> staticContent;
}
