using System;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;
using System.Drawing;
using Microsoft.Win32;

namespace FinFlowPro.Uninstaller
{
    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            DialogResult result = MessageBox.Show(
                "Are you sure you want to completely uninstall FinFlow Pro - Micro Finance Management System from your computer?",
                "FinFlow Pro Uninstall",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Question);

            if (result != DialogResult.Yes)
            {
                return;
            }

            try
            {
                // 1. Terminate any running FinFlow Pro processes
                Process[] processes = Process.GetProcessesByName("FinFlow-Pro");
                foreach (var p in processes)
                {
                    try
                    {
                        p.Kill();
                        p.WaitForExit(2000);
                    }
                    catch { }
                }

                // 2. Remove Shortcuts
                try
                {
                    string desktopShortcut = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Desktop), "FinFlow Pro.lnk");
                    if (File.Exists(desktopShortcut))
                    {
                        File.Delete(desktopShortcut);
                    }
                }
                catch { }

                try
                {
                    string startMenuFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), "FinFlow Pro");
                    if (Directory.Exists(startMenuFolder))
                    {
                        Directory.Delete(startMenuFolder, true);
                    }
                }
                catch { }

                // 3. Remove Registry Entry
                try
                {
                    using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Uninstall", true))
                    {
                        if (key != null)
                        {
                            key.DeleteSubKeyTree("FinFlowPro", false);
                        }
                    }
                }
                catch { }

                // 4. Clean up install directory via background cmd
                string installDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = string.Format("/c timeout /t 1 /nobreak >nul & rd /s /q \"{0}\"", installDir),
                    WindowStyle = ProcessWindowStyle.Hidden,
                    CreateNoWindow = true,
                    UseShellExecute = false
                };

                Process.Start(psi);

                MessageBox.Show(
                    "FinFlow Pro was successfully removed from your computer.",
                    "FinFlow Pro Uninstall",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("An error occurred during uninstall:\n" + ex.Message, "Uninstall Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
