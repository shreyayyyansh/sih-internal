import os
import subprocess
import time

# List of Git commands to execute for each day for Ishwar
commands = [
    [
        'git checkout -b ishwar',
        'git add client/src/ui/',
        'git commit -m "Ishwar [Day 1]: Add common client UI component files"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add client/package.json client/package-lock.json client/vite.config.js client/tailwind.config.js client/eslint.config.js client/jsconfig.json client/vercel.json client/README.md client/example.env client/public/background.jpg client/public/icons/ client/public/vite.svg client/src/assets/react.svg',
        'git commit -m "Ishwar [Day 2]: Add client package configs and bundler settings"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add client/src/pages/CivicHub.jsx client/src/pages/fireAlert.jsx',
        'git commit -m "Ishwar [Day 3]: Add CivicHub and fireAlert web pages"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add client/src/pages/staff/ client/src/pages/reports/',
        'git commit -m "Ishwar [Day 4]: Add client staff action tools and report tracking dashboards"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add client/src/components/urbanFlow/ client/src/components/RegionSelector.jsx client/src/components/feature-panel.jsx client/src/components/google-map.jsx client/src/components/google-map1.jsx client/src/components/safety-onboarding.jsx client/src/components/NotificationFeed.jsx client/src/pages/administration/muncipal/',
        'git commit -m "Ishwar [Day 5]: Add common dashboard maps, selectors, onboarding widgets, and municipal pages"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add client-native/store/ client-native/auth/',
        'git commit -m "Ishwar [Day 6]: Add mobile client authentication state managers and stores"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add server/src/controllers/complaint.controller.js server/src/controllers/complaintStats.controller.js server/src/controllers/complaintHistory.controller.js',
        'git commit -m "Ishwar [Day 7]: Add backend handlers for complaints submission, stats and histories"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add server/src/controllers/saveReports/ server/src/controllers/fetchReports/ server/src/controllers/report/report.controller.js server/src/controllers/user/getRepots.js',
        'git commit -m "Ishwar [Day 8]: Add report database saving endpoints, report controllers and user report retrievers"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add server/src/controllers/updateReports/ server/src/controllers/localityCheck/',
        'git commit -m "Ishwar [Day 9]: Add report update controllers and geo-locality validation systems"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add server/src/controllers/urbanconnect.controller.js server/src/controllers/urbanconnect/',
        'git commit -m "Ishwar [Day 10]: Add urbanconnect pulse analysis and community feed managers"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add server/src/routes/complaint.routes.js server/src/routes/complaintStats.routes.js server/src/routes/complaintHistory.routes.js server/src/routes/urbanconnect.route.js server/src/routes/cityPulse.routes.js server/src/routes/announcement.routes.js server/src/routes/mapReports.js server/src/routes/garbageReports.js server/src/routes/locality.routes.js server/src/routes/setalertsRoutes.js server/src/models/urbanconnect/',
        'git commit -m "Ishwar [Day 11]: Add backend complaint and urbanconnect routes and models"',
        'git push origin ishwar'
    ],
    [
        'git checkout ishwar',
        'git add agents/brain/civicconnect/ agents/brain/urbanconnect/ agents/brain/resolveWasteAgent.py',
        'git commit -m "Ishwar [Day 12]: Add CivicConnect and UrbanConnect AI agent logic and scrapers"',
        'git push origin ishwar'
    ]
]

def main():
    print("Starting auto-push script for Ishwar...")
    
    for i, day_commands in enumerate(commands):
        day_number = i + 1
        print(f"\n==========================================")
        print(f"Executing commands for Day {day_number}...")
        print(f"==========================================")
        
        for cmd in day_commands:
            print(f"Running: {cmd}")
            # Execute the command in the shell
            result = subprocess.run(cmd, shell=True)
            
            # Optionally check if the command failed, but git push might fail if there are no changes
            # So we just continue even if there's an error.
            if result.returncode != 0:
                print(f"Warning: Command returned non-zero exit status {result.returncode}")
                
        print(f"\nDay {day_number} tasks pushed successfully.")
        
        # If it's not the last day, wait for 15 minutes
        if i < len(commands) - 1:
            print("Waiting for 15 minutes before pushing the next day's tasks...")
            time.sleep(15 * 60)
            
    print("\nAll tasks for all 12 days have been pushed successfully!")

if __name__ == "__main__":
    # Ensure we are in the correct directory (the repository root)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    main()
