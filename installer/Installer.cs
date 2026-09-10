using System;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;
using System.Drawing.Drawing2D;
using Microsoft.Win32;

namespace FinFlowPro.Installer
{
    static class Program
    {
        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool isSilent = false;
            foreach (string arg in args)
            {
                if (arg.Equals("/S", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/silent", StringComparison.OrdinalIgnoreCase) ||
                    arg.Equals("/quiet", StringComparison.OrdinalIgnoreCase))
                {
                    isSilent = true;
                }
            }

            if (isSilent)
            {
                InstallEngine engine = new InstallEngine();
                string targetDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FinFlow-Pro");
                engine.PerformInstall(targetDir, true, true, null);
                return;
            }

            Application.Run(new InstallerForm());
        }
    }

    public class InstallEngine
    {
        public bool PerformInstall(string targetDir, bool createDesktopShortcut, bool createStartMenuShortcut, Action<int, string> progressCallback)
        {
            try
            {
                if (progressCallback != null) progressCallback(10, "Closing existing processes...");
                
                // Kill existing processes
                Process[] procs = Process.GetProcessesByName("FinFlow-Pro");
                foreach (var p in procs)
                {
                    try { p.Kill(); p.WaitForExit(1500); } catch { }
                }

                if (!Directory.Exists(targetDir))
                {
                    Directory.CreateDirectory(targetDir);
                }

                if (progressCallback != null) progressCallback(30, "Extracting application files...");

                // Extract embedded payload.zip
                Assembly assembly = Assembly.GetExecutingAssembly();
                using (Stream stream = assembly.GetManifestResourceStream("Payload.zip"))
                {
                    if (stream == null)
                    {
                        throw new Exception("Embedded installation payload (Payload.zip) not found in installer binary.");
                    }

                    using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                    {
                        int totalEntries = archive.Entries.Count;
                        int count = 0;

                        foreach (ZipArchiveEntry entry in archive.Entries)
                        {
                            string relPath = entry.FullName.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
                            string completeFileName = Path.Combine(targetDir, relPath);
                            string directory = Path.GetDirectoryName(completeFileName);

                            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
                            {
                                Directory.CreateDirectory(directory);
                            }

                            if (!string.IsNullOrEmpty(entry.Name))
                            {
                                using (Stream entryStream = entry.Open())
                                using (FileStream fileStream = new FileStream(completeFileName, FileMode.Create, FileAccess.Write, FileShare.None))
                                {
                                    byte[] buffer = new byte[81920];
                                    int bytesRead;
                                    while ((bytesRead = entryStream.Read(buffer, 0, buffer.Length)) > 0)
                                    {
                                        fileStream.Write(buffer, 0, bytesRead);
                                    }
                                }
                            }

                            count++;
                            if (progressCallback != null && totalEntries > 0)
                            {
                                int pct = 30 + (int)((count / (float)totalEntries) * 45);
                                progressCallback(pct, "Extracting: " + entry.Name);
                            }
                        }
                    }
                }

                if (progressCallback != null) progressCallback(80, "Creating desktop shortcuts...");

                string exePath = Path.Combine(targetDir, "FinFlow-Pro.exe");
                string uninstallerPath = Path.Combine(targetDir, "Uninstall.exe");

                if (createDesktopShortcut)
                {
                    string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.Desktop);
                    string shortcutPath = Path.Combine(desktopPath, "FinFlow Pro.lnk");
                    CreateShortcut(shortcutPath, exePath, "FinFlow Pro - Micro Finance Management System", targetDir);
                }

                if (createStartMenuShortcut)
                {
                    if (progressCallback != null) progressCallback(90, "Creating Start Menu shortcuts...");
                    string programsPath = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
                    string appFolder = Path.Combine(programsPath, "FinFlow Pro");
                    if (!Directory.Exists(appFolder)) Directory.CreateDirectory(appFolder);

                    string shortcutPath = Path.Combine(appFolder, "FinFlow Pro.lnk");
                    CreateShortcut(shortcutPath, exePath, "FinFlow Pro - Micro Finance Management System", targetDir);

                    string uninstallShortcutPath = Path.Combine(appFolder, "Uninstall FinFlow Pro.lnk");
                    CreateShortcut(uninstallShortcutPath, uninstallerPath, "Uninstall FinFlow Pro", targetDir);
                }

                if (progressCallback != null) progressCallback(95, "Registering Windows uninstall entry...");

                // Register with Windows Uninstall
                RegisterInRegistry(targetDir, exePath, uninstallerPath);

                if (progressCallback != null) progressCallback(100, "Installation complete!");
                return true;
            }
            catch (Exception ex)
            {
                if (progressCallback != null) progressCallback(-1, "Error: " + ex.Message);
                return false;
            }
        }

        private static void CreateShortcut(string shortcutPath, string targetPath, string description, string workingDir)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.WorkingDirectory = workingDir;
                    shortcut.Description = description;
                    shortcut.IconLocation = targetPath + ",0";
                    shortcut.Save();
                }
            }
            catch { }
        }

        private static void RegisterInRegistry(string targetDir, string exePath, string uninstallerPath)
        {
            try
            {
                using (RegistryKey parent = Registry.CurrentUser.CreateSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall"))
                {
                    using (RegistryKey key = parent.CreateSubKey("FinFlowPro"))
                    {
                        key.SetValue("DisplayName", "FinFlow Pro - Micro Finance Management System");
                        key.SetValue("DisplayVersion", "1.0.0");
                        key.SetValue("Publisher", "FinFlow Pro");
                        key.SetValue("DisplayIcon", exePath + ",0");
                        key.SetValue("InstallLocation", targetDir);
                        key.SetValue("UninstallString", "\"" + uninstallerPath + "\"");
                        key.SetValue("NoModify", 1, RegistryValueKind.DWord);
                        key.SetValue("NoRepair", 1, RegistryValueKind.DWord);
                    }
                }
            }
            catch { }
        }
    }

    public class InstallerForm : Form
    {
        private TextBox txtPath;
        private CheckBox chkDesktop;
        private CheckBox chkStartMenu;
        private CheckBox chkLaunch;
        private Button btnInstall;
        private Button btnCancel;
        private Button btnBrowse;
        private ProgressBar prgBar;
        private Label lblStatus;
        private Panel headerPanel;
        private bool isInstalling = false;
        private bool isFinished = false;

        public InstallerForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "FinFlow Pro Setup";
            this.Size = new Size(540, 430);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = true;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(248, 250, 252);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Try load icon
            try
            {
                Assembly asm = Assembly.GetExecutingAssembly();
                using (Stream s = asm.GetManifestResourceStream("app.ico"))
                {
                    if (s != null) this.Icon = new Icon(s);
                }
            }
            catch { }

            // Header Panel with custom paint
            headerPanel = new Panel();
            headerPanel.Dock = DockStyle.Top;
            headerPanel.Height = 85;
            headerPanel.Paint += HeaderPanel_Paint;
            this.Controls.Add(headerPanel);

            // Body Container Panel
            Panel bodyPanel = new Panel();
            bodyPanel.Location = new Point(24, 100);
            bodyPanel.Size = new Size(475, 220);

            Label lblIntro = new Label();
            lblIntro.Text = "Select the folder where FinFlow Pro will be installed:";
            lblIntro.Location = new Point(0, 5);
            lblIntro.AutoSize = true;
            lblIntro.ForeColor = Color.FromArgb(51, 65, 85);
            bodyPanel.Controls.Add(lblIntro);

            txtPath = new TextBox();
            txtPath.Text = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "FinFlow-Pro");
            txtPath.Location = new Point(0, 32);
            txtPath.Size = new Size(385, 26);
            bodyPanel.Controls.Add(txtPath);

            btnBrowse = new Button();
            btnBrowse.Text = "Browse...";
            btnBrowse.Location = new Point(392, 30);
            btnBrowse.Size = new Size(80, 28);
            btnBrowse.Click += (s, e) =>
            {
                using (FolderBrowserDialog fbd = new FolderBrowserDialog())
                {
                    fbd.SelectedPath = txtPath.Text;
                    if (fbd.ShowDialog() == DialogResult.OK)
                    {
                        txtPath.Text = fbd.SelectedPath;
                    }
                }
            };
            bodyPanel.Controls.Add(btnBrowse);

            chkDesktop = new CheckBox();
            chkDesktop.Text = "Create a Desktop shortcut";
            chkDesktop.Checked = true;
            chkDesktop.Location = new Point(0, 75);
            chkDesktop.AutoSize = true;
            bodyPanel.Controls.Add(chkDesktop);

            chkStartMenu = new CheckBox();
            chkStartMenu.Text = "Create Start Menu shortcuts";
            chkStartMenu.Checked = true;
            chkStartMenu.Location = new Point(0, 105);
            chkStartMenu.AutoSize = true;
            bodyPanel.Controls.Add(chkStartMenu);

            chkLaunch = new CheckBox();
            chkLaunch.Text = "Launch FinFlow Pro when installation finishes";
            chkLaunch.Checked = true;
            chkLaunch.Location = new Point(0, 135);
            chkLaunch.AutoSize = true;
            bodyPanel.Controls.Add(chkLaunch);

            lblStatus = new Label();
            lblStatus.Text = "Ready to install. Click 'Install Now' to proceed.";
            lblStatus.Location = new Point(0, 170);
            lblStatus.Size = new Size(475, 20);
            lblStatus.ForeColor = Color.FromArgb(71, 85, 105);
            bodyPanel.Controls.Add(lblStatus);

            prgBar = new ProgressBar();
            prgBar.Location = new Point(0, 195);
            prgBar.Size = new Size(472, 18);
            prgBar.Visible = false;
            bodyPanel.Controls.Add(prgBar);

            this.Controls.Add(bodyPanel);

            // Bottom Separator and Buttons
            Panel footerPanel = new Panel();
            footerPanel.Dock = DockStyle.Bottom;
            footerPanel.Height = 60;
            footerPanel.BackColor = Color.FromArgb(241, 245, 249);

            btnCancel = new Button();
            btnCancel.Text = "Cancel";
            btnCancel.Location = new Point(400, 14);
            btnCancel.Size = new Size(95, 34);
            btnCancel.Click += (s, e) => this.Close();
            footerPanel.Controls.Add(btnCancel);

            btnInstall = new Button();
            btnInstall.Text = "Install Now";
            btnInstall.Location = new Point(290, 14);
            btnInstall.Size = new Size(100, 34);
            btnInstall.BackColor = Color.FromArgb(126, 20, 255);
            btnInstall.ForeColor = Color.White;
            btnInstall.FlatStyle = FlatStyle.Flat;
            btnInstall.FlatAppearance.BorderSize = 0;
            btnInstall.Click += BtnInstall_Click;
            footerPanel.Controls.Add(btnInstall);

            this.Controls.Add(footerPanel);
        }

        private void HeaderPanel_Paint(object sender, PaintEventArgs e)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            Rectangle rect = headerPanel.ClientRectangle;
            using (LinearGradientBrush brush = new LinearGradientBrush(
                rect,
                Color.FromArgb(126, 20, 255), // FinFlow Purple
                Color.FromArgb(14, 165, 233),  // Cyan
                LinearGradientMode.Horizontal))
            {
                g.FillRectangle(brush, rect);
            }

            using (Font titleFont = new Font("Segoe UI", 14.5f, FontStyle.Bold))
            using (Font subFont = new Font("Segoe UI", 9.5f, FontStyle.Regular))
            using (SolidBrush textBrush = new SolidBrush(Color.White))
            using (SolidBrush subBrush = new SolidBrush(Color.FromArgb(224, 231, 255)))
            {
                g.DrawString("FinFlow Pro - Setup", titleFont, textBrush, new PointF(24, 16));
                g.DrawString("Micro Finance Management System • 1-Click Installation", subFont, subBrush, new PointF(24, 48));
            }
        }

        private void BtnInstall_Click(object sender, EventArgs e)
        {
            if (isFinished)
            {
                if (chkLaunch.Checked)
                {
                    string exePath = Path.Combine(txtPath.Text, "FinFlow-Pro.exe");
                    if (File.Exists(exePath))
                    {
                        Process.Start(new ProcessStartInfo(exePath) { UseShellExecute = true });
                    }
                }
                this.Close();
                return;
            }

            if (isInstalling) return;

            string targetDir = txtPath.Text.Trim();
            if (string.IsNullOrEmpty(targetDir))
            {
                MessageBox.Show("Please specify an installation path.", "Invalid Path", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            isInstalling = true;
            txtPath.Enabled = false;
            btnBrowse.Enabled = false;
            chkDesktop.Enabled = false;
            chkStartMenu.Enabled = false;
            btnInstall.Enabled = false;
            btnCancel.Enabled = false;
            prgBar.Visible = true;
            prgBar.Value = 0;

            bool desktop = chkDesktop.Checked;
            bool startMenu = chkStartMenu.Checked;

            System.Threading.ThreadPool.QueueUserWorkItem((state) =>
            {
                InstallEngine engine = new InstallEngine();
                bool success = engine.PerformInstall(targetDir, desktop, startMenu, (progress, message) =>
                {
                    if (this.InvokeRequired)
                    {
                        this.BeginInvoke(new Action(() =>
                        {
                            if (progress >= 0)
                            {
                                prgBar.Value = Math.Min(100, Math.Max(0, progress));
                                lblStatus.Text = message;
                            }
                            else
                            {
                                lblStatus.Text = message;
                                lblStatus.ForeColor = Color.Red;
                            }
                        }));
                    }
                });

                this.BeginInvoke(new Action(() =>
                {
                    isInstalling = false;
                    if (success)
                    {
                        isFinished = true;
                        prgBar.Value = 100;
                        lblStatus.Text = "Installation completed successfully!";
                        lblStatus.ForeColor = Color.FromArgb(22, 101, 52);
                        btnInstall.Text = "Launch & Exit";
                        btnInstall.Enabled = true;
                        btnCancel.Visible = false;
                        btnInstall.Location = new Point(370, 14);
                        btnInstall.Size = new Size(125, 34);
                    }
                    else
                    {
                        btnInstall.Enabled = true;
                        btnCancel.Enabled = true;
                        MessageBox.Show("Installation failed. Please review folder permissions.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    }
                }));
            });
        }
    }
}
