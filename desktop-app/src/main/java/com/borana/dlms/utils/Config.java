package com.borana.dlms.utils;

import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Properties;

public class Config {
    private static final Properties properties = new Properties();
    
    static {
        properties.setProperty("api.base.url", "http://localhost:3001/api");
        properties.setProperty("api.timeout", "30");
    }
    
    public static void loadConfig() {
        try (InputStream input = new FileInputStream("config.properties")) {
            properties.load(input);
            System.out.println("Configuration loaded from config.properties");
        } catch (IOException e) {
            System.out.println("Using default configuration");
        }
    }
    
    public static String getApiBaseUrl() {
        return properties.getProperty("api.base.url");
    }
}