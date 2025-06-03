(ns connection-test
  (:import [java.sql DriverManager]))

(defn test-jdbc-connection
  "Test direct JDBC connection with minimal configuration"
  [host port database user password]
  (let [url (format "jdbc:sqlserver://%s:%s;databaseName=%s;encrypt=false;trustServerCertificate=true;loginTimeout=10"
                    host port database)
        props (java.util.Properties.)]
    (.setProperty props "user" user)
    (.setProperty props "password" password)

    (println "Testing connection to:" url)
    (println "JVM TLS settings active:" (System/getProperty "jdk.tls.client.protocols"))

    (try
      (Class/forName "com.microsoft.sqlserver.jdbc.SQLServerDriver")
      (with-open [conn (DriverManager/getConnection url props)]
        (println "✅ SUCCESS: Connected to SQL Server!")
        (with-open [stmt (.createStatement conn)
                    rs (.executeQuery stmt "SELECT @@VERSION")]
          (when (.next rs)
            (println "Server version:" (.getString rs 1)))))
      (catch Exception e
        (println "❌ FAILED: Connection error")
        (println "Error type:" (.getSimpleName (class e)))
        (println "Message:" (.getMessage e))
        (when-let [cause (.getCause e)]
          (println "Root cause:" (.getMessage cause))
          (when-let [root-cause (.getCause cause)]
            (println "Deeper cause:" (.getMessage root-cause))))))))

;; Example usage - replace with your actual connection details:
(test-jdbc-connection "192.168.1.214" "1433" "MDM" "sa" "ct#qwe123")

(println "Connection test function loaded. Usage:")
(println "(test-jdbc-connection \"192.168.1.214\" \"1433\" \"MDM\" \"sa\" \"ct#qwe123\")")

(ns jtds-test
  (:import [java.sql DriverManager]))

(defn test-jtds []
  (let [url "jdbc:jtds:sqlserver://192.168.1.214:1433/MDM;ssl=off;loginTimeout=10"
        props (doto (java.util.Properties.)
                (.setProperty "user" "sa")
                (.setProperty "password" "ct#qwe123"))]

    (println "Testing jTDS driver (often more flexible with legacy SSL)")
    (println "URL:" url)

    (try
      (Class/forName "net.sourceforge.jtds.jdbc.Driver")
      (with-open [conn (DriverManager/getConnection url props)]
        (println "✅ SUCCESS with jTDS!")
        (with-open [stmt (.createStatement conn)
                    rs (.executeQuery stmt "SELECT @@VERSION")]
          (when (.next rs)
            (println "Server:" (.getString rs 1)))))
      (catch Exception e
        (println "❌ jTDS failed:" (.getMessage e))
        (when (.getCause e)
          (println "Cause:" (.getMessage (.getCause e))))))))

(test-jtds)
