package com.insurance.claims.controller;

import com.insurance.claims.dto.ClaimRequest;
import com.insurance.claims.dto.ClaimResponse;
import com.insurance.claims.dto.ClaimStatusUpdate;
import com.insurance.claims.dto.DashboardStats;
import com.insurance.claims.service.ClaimService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/claims")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ClaimController {

    private final ClaimService claimService;

    @PostMapping
    public ResponseEntity<ClaimResponse> createClaim(
            @Valid @RequestBody ClaimRequest request,
            @AuthenticationPrincipal OAuth2User principal) {
        String userId = principal != null ? principal.getAttribute("sub") : "anonymous";
        ClaimResponse response = claimService.createClaim(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ClaimResponse>> getAllClaims(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestParam(required = false, defaultValue = "false") boolean allClaims) {
        if (allClaims) {
            return ResponseEntity.ok(claimService.getAllClaims());
        }
        String userId = principal != null ? principal.getAttribute("sub") : null;
        if (userId != null) {
            return ResponseEntity.ok(claimService.getClaimsByUserId(userId));
        }
        return ResponseEntity.ok(claimService.getAllClaims());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClaimResponse> getClaimById(@PathVariable String id) {
        ClaimResponse response = claimService.getClaimById(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClaimResponse> updateClaim(
            @PathVariable String id,
            @Valid @RequestBody ClaimRequest request) {
        ClaimResponse response = claimService.updateClaim(id, request);
        return ResponseEntity.ok(response);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ClaimResponse> updateClaimStatus(
            @PathVariable String id,
            @Valid @RequestBody ClaimStatusUpdate statusUpdate) {
        ClaimResponse response = claimService.updateClaimStatus(id, statusUpdate);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteClaim(@PathVariable String id) {
        claimService.deleteClaim(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<DashboardStats> getDashboardStats(
            @AuthenticationPrincipal OAuth2User principal,
            @RequestParam(required = false, defaultValue = "false") boolean allStats) {
        String userId = null;
        if (!allStats && principal != null) {
            userId = principal.getAttribute("sub");
        }
        DashboardStats stats = claimService.getDashboardStats(userId);
        return ResponseEntity.ok(stats);
    }
}
