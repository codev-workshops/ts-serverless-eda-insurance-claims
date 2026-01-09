package com.insurance.claims.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "ui_config")
public class UIConfig {

    @Id
    private String id;

    private String pageId;

    private Map<String, String> labels;

    private Map<String, String> staticContent;

    private LocalDateTime updatedAt;

    private String updatedBy;
}
