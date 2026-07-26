import re

# PaidTasksManagement.jsx
path_admin = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\admin\PaidTasksManagement.jsx'
with open(path_admin, 'r', encoding='utf-8') as f:
    content_admin = f.read()

replacement_admin = """                                      {task.applicants?.length > 0 && (
                                          <button
                                              onClick={() => handleViewApplicants(task)}
                                              className="flex items-center gap-2 px-2 py-1 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
                                              title="View Applicants"
                                          >
                                              <div className="flex -space-x-2">
                                                  {task.applicants.slice(0, 3).map((a, i) => (
                                                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 relative z-[1]">
                                                          {a.user?.photo ? (
                                                              <img src={a.user.photo} alt={a.user?.name} className="w-full h-full object-cover" />
                                                          ) : (
                                                              a.user?.name?.charAt(0) || '?'
                                                          )}
                                                      </div>
                                                  ))}
                                              </div>
                                              <div className="text-xs font-bold text-gray-700">
                                                  {task.applicants.length === 1 
                                                      ? task.applicants[0].user?.name?.split(' ')[0] 
                                                      : `${task.applicants.length} Applicants`}
                                              </div>
                                          </button>
                                      )}"""

content_admin = re.sub(
    r"\{\s*task\.applicants\?\.length\s*>\s*0\s*&&\s*\(\s*<button[^>]*handleViewApplicants\(task\)[^>]*>.*?\{task\.applicants\.length\}\s*Applicant[^<]*</button>\s*\)\s*\}",
    replacement_admin,
    content_admin,
    flags=re.DOTALL
)

with open(path_admin, 'w', encoding='utf-8') as f:
    f.write(content_admin)


# BrowseTasks.jsx
path_user = r'd:\Downloads\LMS-Adeeb-Technology-Lab\frontend\src\pages\job\BrowseTasks.jsx'
with open(path_user, 'r', encoding='utf-8') as f:
    content_user = f.read()

replacement_user = """                                      {task.applicants?.length > 0 && !expired && (
                                          <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded-xl" title="Applicants">
                                              <div className="flex -space-x-2">
                                                  {task.applicants.slice(0, 3).map((a, i) => (
                                                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0 relative z-[1]">
                                                          {a.user?.photo ? (
                                                              <img src={a.user.photo} alt={a.user?.name} className="w-full h-full object-cover" />
                                                          ) : (
                                                              a.user?.name?.charAt(0) || '?'
                                                          )}
                                                      </div>
                                                  ))}
                                              </div>
                                              <div className="text-xs font-bold text-gray-700">
                                                  {task.applicants.length === 1 
                                                      ? task.applicants[0].user?.name?.split(' ')[0] 
                                                      : `${task.applicants.length} Applicants`}
                                              </div>
                                          </div>
                                      )}"""

content_user = re.sub(
    r"\{\s*task\.applicants\?\.length\s*>\s*0\s*&&\s*!expired\s*&&\s*\(\s*<span[^>]*>.*?\{task\.applicants\.length\}\s*Applicant[^<]*</span>\s*\)\s*\}",
    replacement_user,
    content_user,
    flags=re.DOTALL
)

with open(path_user, 'w', encoding='utf-8') as f:
    f.write(content_user)

print("Replaced applicant badges with avatars and names.")
