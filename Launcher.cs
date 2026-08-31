using System;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;

namespace MicroFinanceApp
{
    static class Program
    {
        private static HttpListener listener;
        private static string webRoot;
        private static int port = 5173;
        private static bool isRunning = true;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            webRoot = Path.Combine(baseDir, "micro-finance-web", "dist");

            if (!Directory.Exists(webRoot))
            {
                webRoot = Path.Combine(baseDir, "dist");
            }

            if (!Directory.Exists(webRoot))
            {
                MessageBox.Show("Could not locate the web application build directory:\n" + webRoot + "\n\nPlease ensure 'micro-finance-web/dist' exists.", "FinFlow Pro - Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Find open port
            for (int p = 5173; p < 5200; p++)
            {
                try
                {
                    listener = new HttpListener();
                    listener.Prefixes.Add("http://127.0.0.1:" + p + "/");
                    listener.Prefixes.Add("http://localhost:" + p + "/");
                    listener.Start();
                    port = p;
                    break;
                }
                catch
                {
                    if (listener != null) listener.Close();
                }
            }

            if (listener == null || !listener.IsListening)
            {
                MessageBox.Show("Failed to bind local server port. Please check permissions.", "FinFlow Pro", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }

            // Start HTTP Server Thread
            Thread serverThread = new Thread(StartServer);
            serverThread.IsBackground = true;
            serverThread.Start();

            string url = "http://localhost:" + port + "/";

            // Launch browser in app mode if Chrome or Edge exists
            LaunchAppWindow(url);

            // Tray App Form
            Application.Run(new TrayApplicationContext(url));
        }

        private static void StartServer()
        {
            while (isRunning)
            {
                try
                {
                    var context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem((state) => ProcessRequest(context));
                }
                catch
                {
                    if (!isRunning) break;
                }
            }
        }

        private static void ProcessRequest(HttpListenerContext context)
        {
            try
            {
                string rawUrl = context.Request.Url.AbsolutePath.TrimStart('/');
                if (string.IsNullOrEmpty(rawUrl)) rawUrl = "index.html";

                string filePath = Path.Combine(webRoot, rawUrl.Replace('/', Path.DirectorySeparatorChar));

                // Fallback to index.html for SPA routing
                if (!File.Exists(filePath))
                {
                    filePath = Path.Combine(webRoot, "index.html");
                }

                if (File.Exists(filePath))
                {
                    byte[] bytes = File.ReadAllBytes(filePath);
                    string ext = Path.GetExtension(filePath).ToLower();
                    string mime = "application/octet-stream";

                    switch (ext)
                    {
                        case ".html": mime = "text/html; charset=utf-8"; break;
                        case ".js":
                        case ".mjs": mime = "application/javascript; charset=utf-8"; break;
                        case ".css": mime = "text/css; charset=utf-8"; break;
                        case ".json": mime = "application/json; charset=utf-8"; break;
                        case ".png": mime = "image/png"; break;
                        case ".jpg":
                        case ".jpeg": mime = "image/jpeg"; break;
                        case ".svg": mime = "image/svg+xml"; break;
                        case ".ico": mime = "image/x-icon"; break;
                        case ".woff":
                        case ".woff2": mime = "font/woff2"; break;
                    }

                    context.Response.ContentType = mime;
                    context.Response.ContentLength64 = bytes.Length;
                    context.Response.AddHeader("Cache-Control", "no-cache");
                    context.Response.OutputStream.Write(bytes, 0, bytes.Length);
                }
                else
                {
                    context.Response.StatusCode = 404;
                }
            }
            catch { }
            finally
            {
                try { context.Response.OutputStream.Close(); } catch { }
            }
        }

        private static void LaunchAppWindow(string url)
        {
            string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
            if (!File.Exists(edgePath))
            {
                edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
            }

            string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe");
            if (!File.Exists(chromePath))
            {
                chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe");
            }

            try
            {
                if (File.Exists(edgePath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = edgePath,
                        Arguments = "--app=" + url + " --window-size=1400,900 --user-data-dir=\"" + Path.Combine(Path.GetTempPath(), "FinFlowPro_Profile") + "\"",
                        UseShellExecute = true
                    });
                    return;
                }
                else if (File.Exists(chromePath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = chromePath,
                        Arguments = "--app=" + url + " --window-size=1400,900",
                        UseShellExecute = true
                    });
                    return;
                }
            }
            catch { }

            // Default browser fallback
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }

        public static void Shutdown()
        {
            isRunning = false;
            if (listener != null)
            {
                try { listener.Stop(); } catch { }
                try { listener.Close(); } catch { }
            }
            Application.Exit();
        }
    }

    class TrayApplicationContext : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private string appUrl;

        public TrayApplicationContext(string url)
        {
            appUrl = url;

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add("Open FinFlow Pro App", (s, e) => Process.Start(new ProcessStartInfo(appUrl) { UseShellExecute = true }));
            menu.MenuItems.Add("-");
            menu.MenuItems.Add("Exit Application", (s, e) => {
                trayIcon.Visible = false;
                Program.Shutdown();
            });

            trayIcon = new NotifyIcon();
            trayIcon.Icon = SystemIcons.Application;
            trayIcon.ContextMenu = menu;
            trayIcon.Text = "FinFlow Pro - Micro Finance OS (Running on " + url + ")";
            trayIcon.Visible = true;

            trayIcon.DoubleClick += (s, e) => Process.Start(new ProcessStartInfo(appUrl) { UseShellExecute = true });
        }
    }
}
