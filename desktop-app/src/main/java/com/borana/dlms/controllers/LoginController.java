package com.borana.dlms.controllers;

import javafx.fxml.FXML;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.PasswordField;
import javafx.scene.control.TextField;
import javafx.stage.Stage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

public class LoginController {
    private static final Logger logger = LoggerFactory.getLogger(LoginController.class);
    
    @FXML private TextField emailField;
    @FXML private PasswordField passwordField;
    @FXML private Button loginButton;
    @FXML private Button exitButton;
    @FXML private Label errorLabel;
    
    @SuppressWarnings("unused")
    private Stage stage;
    
    @FXML
    public void initialize() {
        // Set up enter key to trigger login
        passwordField.setOnAction(event -> handleLogin());
    }
    
    @FXML
    private void handleLogin() {
        String email = emailField.getText().trim();
        String password = passwordField.getText().trim();
        
        // Validate input
        if (email.isEmpty() || password.isEmpty()) {
            showError("Please enter both email and password");
            return;
        }
        
        if (!isValidEmail(email)) {
            showError("Please enter a valid email address");
            return;
        }
        
        // Show loading state
        loginButton.setText("Logging in...");
        loginButton.setDisable(true);
        errorLabel.setVisible(false);
        
        try {
            // TODO: Call your backend API
            // For now, we'll simulate login
            Thread.sleep(1000); // Simulate API call
            
            // If login successful, open dashboard
            openDashboard();
            
        } catch (Exception e) {
            logger.error("Login failed", e);
            showError("Login failed: " + e.getMessage());
        } finally {
            loginButton.setText("Login");
            loginButton.setDisable(false);
        }
    }
    
    @FXML
    private void handleExit() {
        System.exit(0);
    }
    
    private void openDashboard() {
        try {
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/Dashboard.fxml"));
            Parent root = loader.load();
            
            Stage dashboardStage = new Stage();
            dashboardStage.setTitle("DLMS - Dashboard");
            dashboardStage.setScene(new Scene(root, 1200, 800));
            dashboardStage.setMaximized(true);
            
            // Close login window
            Stage currentStage = (Stage) loginButton.getScene().getWindow();
            currentStage.close();
            
            // Show dashboard
            dashboardStage.show();
            
            logger.info("Dashboard opened successfully");
        } catch (IOException e) {
            logger.error("Failed to open dashboard", e);
            showError("Failed to open dashboard: " + e.getMessage());
        }
    }
    
    private boolean isValidEmail(String email) {
        return email.matches("^[A-Za-z0-9+_.-]+@(.+)$");
    }
    
    private void showError(String message) {
        errorLabel.setText(message);
        errorLabel.setVisible(true);
    }
    
    public void setStage(Stage stage) {
        this.stage = stage;
    }
}