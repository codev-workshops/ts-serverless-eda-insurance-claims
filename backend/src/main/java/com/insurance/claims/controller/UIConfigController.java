package com.insurance.claims.controller;

import com.insurance.claims.dto.UIConfigRequest;
import com.insurance.claims.model.UIConfig;
import com.insurance.claims.service.UIConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UIConfigController {

    private final UIConfigService uiConfigService;

    @GetMapping("/{pageId}")
    public ResponseEntity<UIConfig> getConfigByPageId(@PathVariable String pageId) {
        UIConfig config = uiConfigService.getConfigByPageId(pageId);
        return ResponseEntity.ok(config);
    }

    @GetMapping
    public ResponseEntity<List<UIConfig>> getAllConfigs() {
        List<UIConfig> configs = uiConfigService.getAllConfigs();
        return ResponseEntity.ok(configs);
    }

    @PutMapping
    public ResponseEntity<UIConfig> updateConfig(
            @Valid @RequestBody UIConfigRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        String updatedBy = principal != null ? principal.getAttribute("email") : "anonymous";
        UIConfig config = uiConfigService.updateConfig(request, updatedBy);
        return ResponseEntity.ok(config);
    }

    @DeleteMapping("/{pageId}")
    public ResponseEntity<Void> deleteConfig(@PathVariable String pageId) {
        uiConfigService.deleteConfig(pageId);
        return ResponseEntity.noContent().build();
    }
}
