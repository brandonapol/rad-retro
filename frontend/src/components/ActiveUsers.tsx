interface ActiveUsersProps {
  users: string[];
}

export function ActiveUsers({ users }: ActiveUsersProps) {
  if (users.length === 0) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Active Users ({users.length})
      </h3>
      <div className="flex flex-wrap gap-2">
        {users.map((user, index) => (
          <span
            key={`${user}-${index}`}
            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
          >
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            {user}
          </span>
        ))}
      </div>
    </div>
  );
}
