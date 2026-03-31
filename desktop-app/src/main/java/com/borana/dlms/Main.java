package com.borana.dlms;

import javafx.application.Application;
import javafx.fxml.FXMLLoader;
import javafx.scene.Parent;
import javafx.scene.Scene;
import javafx.stage.Stage;

public class Main extends Application {

    public static void main(String[] args) {
        System.out.println("Starting DLMS Desktop Application...");
        launch(args);
    }

    @Override
    public void start(Stage primaryStage) {
        try {
            // Load the login screen
            FXMLLoader loader = new FXMLLoader(getClass().getResource("/fxml/Login.fxml"));
            Parent root = loader.load();

            Scene scene = new Scene(root, 800, 600);

            primaryStage.setTitle("DLMS - Digital Library Management System");
            primaryStage.setScene(scene);
            primaryStage.setResizable(false);
            primaryStage.show();

            System.out.println("Application started successfully");
        } catch (Exception e) {
            System.err.println("Failed to start application: " + e.getMessage());
            e.printStackTrace();
            showErrorDialog("Application Error", "Failed to start application: " + e.getMessage());
            System.exit(1);
        }
    }

    private void showErrorDialog(String title, String message) {
        javafx.scene.control.Alert alert = new javafx.scene.control.Alert(
            javafx.scene.control.Alert.AlertType.ERROR
        );
        alert.setTitle(title);
        alert.setHeaderText(null);
        alert.setContentText(message);
        alert.showAndWait();
    }
}