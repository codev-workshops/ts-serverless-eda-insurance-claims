package com.insurance.claims.service;

import com.insurance.claims.dto.UIConfigRequest;
import com.insurance.claims.model.UIConfig;
import com.insurance.claims.repository.UIConfigRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UIConfigService {

    private final UIConfigRepository uiConfigRepository;

    public UIConfig getConfigByPageId(String pageId) {
        return uiConfigRepository.findByPageId(pageId)
                .orElseGet(() -> createDefaultConfig(pageId));
    }

    public List<UIConfig> getAllConfigs() {
        return uiConfigRepository.findAll();
    }

    public UIConfig updateConfig(UIConfigRequest request, String updatedBy) {
        Optional<UIConfig> existingConfig = uiConfigRepository.findByPageId(request.getPageId());

        UIConfig config;
        if (existingConfig.isPresent()) {
            config = existingConfig.get();
            if (request.getLabels() != null) {
                config.setLabels(request.getLabels());
            }
            if (request.getStaticContent() != null) {
                config.setStaticContent(request.getStaticContent());
            }
        } else {
            config = UIConfig.builder()
                    .pageId(request.getPageId())
                    .labels(request.getLabels() != null ? request.getLabels() : new HashMap<>())
                    .staticContent(request.getStaticContent() != null ? request.getStaticContent() : new HashMap<>())
                    .build();
        }

        config.setUpdatedAt(LocalDateTime.now());
        config.setUpdatedBy(updatedBy);

        return uiConfigRepository.save(config);
    }

    public void deleteConfig(String pageId) {
        UIConfig config = uiConfigRepository.findByPageId(pageId)
                .orElseThrow(() -> new RuntimeException("Config not found for page: " + pageId));
        uiConfigRepository.delete(config);
    }

    private UIConfig createDefaultConfig(String pageId) {
        Map<String, String> defaultLabels = getDefaultLabels(pageId);
        Map<String, String> defaultContent = getDefaultContent(pageId);

        UIConfig config = UIConfig.builder()
                .pageId(pageId)
                .labels(defaultLabels)
                .staticContent(defaultContent)
                .updatedAt(LocalDateTime.now())
                .build();

        return uiConfigRepository.save(config);
    }

    private Map<String, String> getDefaultLabels(String pageId) {
        Map<String, String> labels = new HashMap<>();
        switch (pageId) {
            case "dashboard":
                labels.put("pageTitle", "Dashboard");
                labels.put("totalClaims", "Total Claims");
                labels.put("pendingClaims", "Pending");
                labels.put("approvedClaims", "Approved");
                labels.put("rejectedClaims", "Rejected");
                break;
            case "claims":
                labels.put("pageTitle", "Claims");
                labels.put("newClaim", "New Claim");
                labels.put("claimId", "Claim ID");
                labels.put("policyNumber", "Policy Number");
                labels.put("claimantName", "Claimant Name");
                labels.put("claimType", "Claim Type");
                labels.put("amount", "Amount");
                labels.put("status", "Status");
                labels.put("actions", "Actions");
                break;
            case "claimForm":
                labels.put("pageTitle", "Submit New Claim");
                labels.put("policyNumber", "Policy Number");
                labels.put("claimantName", "Claimant Name");
                labels.put("claimantEmail", "Email");
                labels.put("claimType", "Claim Type");
                labels.put("claimAmount", "Claim Amount");
                labels.put("incidentDate", "Incident Date");
                labels.put("description", "Description");
                labels.put("submit", "Submit Claim");
                break;
            case "admin":
                labels.put("pageTitle", "Admin Settings");
                labels.put("uiConfiguration", "UI Configuration");
                labels.put("selectPage", "Select Page");
                labels.put("saveChanges", "Save Changes");
                break;
            default:
                labels.put("pageTitle", pageId);
        }
        return labels;
    }

    private Map<String, String> getDefaultContent(String pageId) {
        Map<String, String> content = new HashMap<>();
        switch (pageId) {
            case "dashboard":
                content.put("welcomeMessage", "Welcome to Insurance Claims Portal");
                content.put("description", "Manage your insurance claims efficiently");
                break;
            case "claims":
                content.put("noClaimsMessage", "No claims found. Submit your first claim!");
                break;
            case "claimForm":
                content.put("instructions", "Please fill out all required fields to submit your claim.");
                content.put("successMessage", "Your claim has been submitted successfully!");
                break;
            case "admin":
                content.put("instructions", "Configure UI labels and content for each page.");
                break;
            default:
                content.put("description", "");
        }
        return content;
    }
}
